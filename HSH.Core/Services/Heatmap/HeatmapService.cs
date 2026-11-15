using System.Diagnostics;
using HSH.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace HSH.Core.Services.Heatmap;

/// <param name="CacheFile">Where the finished PNG is kept, so it survives a restart of the API.</param>
public record HeatmapOptions(string CacheFile);

/// <param name="State">"idle", "generating", "ready" or "failed".</param>
public record HeatmapStatus(string State, DateTime? GeneratedAtUtc, string? Error);

public interface IHeatmapService
{
    HeatmapStatus GetStatus();

    /// <summary>The finished PNG, or null while it is not ready. Starts generating it if nobody has yet.</summary>
    byte[]? GetImageOrStart();
}

/// <summary>
/// Builds the world fire-density heatmap from the BSP trees (TreeBoundaries) and the fire-to-cell table (QuadTrees):
/// 1. QuadTrees grouped by country and CellId gives the number of fires in every cell;
/// 2. walking each country's tree gives the lat/lon rectangle of every cell;
/// 3. each cell's fires are spread over the squares of a world grid, which is drawn as a PNG.
/// That reads the whole QuadTrees table once, so it runs in the background and the result is cached
/// in memory and on disk (the historical data does not change). Delete the cache file to build it again.
/// Registered as a singleton.
/// </summary>
public sealed class HeatmapService(
    IServiceScopeFactory scopes,
    HeatmapOptions options,
    ILogger<HeatmapService> logger) : IHeatmapService
{
    private readonly Lock gate = new();
    private byte[]? image;
    private DateTime? generatedAt;
    private Task? running;
    private string? error;
    private bool diskChecked;

    public HeatmapStatus GetStatus()
    {
        lock (gate)
        {
            LoadFromDisk();
            if (image is not null) return new("ready", generatedAt, null);
            if (running is not null) return new("generating", null, null);
            if (error is not null) return new("failed", null, error);
            return new("idle", null, null);
        }
    }

    public byte[]? GetImageOrStart()
    {
        lock (gate)
        {
            LoadFromDisk();
            if (image is not null) return image;

            if (running is null)
            {
                error = null;
                running = Task.Run(GenerateAsync);
            }
            return null;
        }
    }

    private void LoadFromDisk()
    {
        if (diskChecked) return;
        diskChecked = true;
        try
        {
            if (File.Exists(options.CacheFile))
            {
                image = File.ReadAllBytes(options.CacheFile);
                generatedAt = File.GetLastWriteTimeUtc(options.CacheFile);
            }
        }
        catch (Exception e)
        {
            logger.LogWarning(e, "Could not read the cached heatmap {File}", options.CacheFile);
        }
    }

    private async Task GenerateAsync()
    {
        try
        {
            var watch = Stopwatch.StartNew();
            byte[] png = await BuildAsync();
            logger.LogInformation("Heatmap generated in {Seconds:N0} s", watch.Elapsed.TotalSeconds);

            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(options.CacheFile))!);
                await File.WriteAllBytesAsync(options.CacheFile, png);
            }
            catch (Exception e)
            {
                logger.LogWarning(e, "Could not save the heatmap to {File}", options.CacheFile);
            }

            lock (gate)
            {
                image = png;
                generatedAt = DateTime.UtcNow;
            }
        }
        catch (Exception e)
        {
            logger.LogError(e, "Heatmap generation failed");
            lock (gate) error = e.Message;
        }
        finally
        {
            lock (gate) running = null;
        }
    }

    private async Task<byte[]> BuildAsync()
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.SetCommandTimeout(TimeSpan.FromHours(2)); // the QuadTrees pass reads every row once

        // 1. fires per cell, per country
        logger.LogInformation("Heatmap: counting fires per cell...");
        var counts = new Dictionary<int, Dictionary<ushort, int>>();
        await foreach (var row in db.QuadTrees.AsNoTracking()
            .GroupBy(q => new { q.CountryId, q.CellId })
            .Select(g => new { g.Key.CountryId, g.Key.CellId, Count = g.Count() })
            .AsAsyncEnumerable())
        {
            if (!counts.TryGetValue(row.CountryId, out var cells)) counts[row.CountryId] = cells = [];
            cells[row.CellId] = row.Count;
        }

        // 2. the trees (TreeId = CountryId); there is no index on TreeId, so the table is read once
        logger.LogInformation("Heatmap: loading the BSP trees...");
        var rows = new Dictionary<int, List<(int BoundaryId, float Value, int Left, int Right)>>();
        await foreach (var b in db.TreeBoundaries.AsNoTracking()
            .Select(b => new { b.TreeId, b.BoundaryId, b.Value, b.LeftChildId, b.RightChildId })
            .AsAsyncEnumerable())
        {
            if (!counts.ContainsKey(b.TreeId)) continue; // a tree without fires adds nothing
            if (!rows.TryGetValue(b.TreeId, out var list)) rows[b.TreeId] = list = [];
            list.Add((b.BoundaryId, b.Value, b.LeftChildId, b.RightChildId));
        }

        // 3. spread every cell's fires over the grid
        logger.LogInformation("Heatmap: drawing {Countries} countries...", rows.Count);
        var grid = new HeatmapGrid();
        foreach (var (countryId, cells) in counts)
        {
            if (!rows.TryGetValue(countryId, out var list))
            {
                logger.LogWarning("Heatmap: country {CountryId} has fires in QuadTrees but no tree; skipped", countryId);
                continue;
            }

            list.Sort((a, b) => a.BoundaryId.CompareTo(b.BoundaryId)); // the importer sorts the same way
            var tree = new BspTree(
                list.Select(r => r.Value).ToArray(),
                list.Select(r => r.Left).ToArray(),
                list.Select(r => r.Right).ToArray());
            rows.Remove(countryId);

            AddCountry(grid, tree, cells);
        }

        return grid.OutputBitmap();
    }

    /// <summary>Adds one country's fires to the grid.</summary>
    private static void AddCountry(HeatmapGrid grid, BspTree tree, Dictionary<ushort, int> cells)
    {
        // The outer cells of a tree reach to the end of the world; they are cut at the area the tree's splits
        // cover (plus a little margin), otherwise their fires would be spread over oceans and other countries.
        var extent = tree.Extent() ?? new GeoRect(-180, 180, -90, 90);
        double marginLon = Math.Max(0.25, (extent.MaxLon - extent.MinLon) * 0.02);
        double marginLat = Math.Max(0.25, (extent.MaxLat - extent.MinLat) * 0.02);
        var bounds = new GeoRect(
            Math.Max(-180, extent.MinLon - marginLon), Math.Min(180, extent.MaxLon + marginLon),
            Math.Max(-90, extent.MinLat - marginLat), Math.Min(90, extent.MaxLat + marginLat));

        // A CellId can belong to more than one rectangle (paths of different length can give the same number);
        // its fires are then shared by area.
        var rects = tree.Cells(bounds).GroupBy(c => c.CellId).ToDictionary(g => g.Key, g => g.Select(c => c.Rect).ToList());

        foreach (var (cellId, count) in cells)
        {
            if (!rects.TryGetValue(cellId, out var parts)) continue; // no area left inside the clipped bounds

            double total = parts.Sum(Area);
            foreach (var rect in parts)
                grid.Add(rect, total > 0 ? count * Area(rect) / total : (double)count / parts.Count);
        }

        static double Area(GeoRect r) => (r.MaxLon - r.MinLon) * (r.MaxLat - r.MinLat);
    }
}
