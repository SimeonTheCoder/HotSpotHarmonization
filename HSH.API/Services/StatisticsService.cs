using HSH.API.Models;
using HSH.Data;
using HSH.Data.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HSH.API.Services;

public interface IStatisticsService
{
    /// <summary>Hotspots per month (always 12 rows) of one country in one year. Null if the country is unknown.</summary>
    Task<IReadOnlyList<MonthlyRow>?> GetMonthlyAsync(string countryCode, int year, IReadOnlyCollection<FireType> types, CancellationToken ct = default);

    /// <summary>Hotspots per month of one country for two years (24 rows: yearA then yearB). Null if the country is unknown.</summary>
    Task<IReadOnlyList<MonthlyRow>?> CompareYearsAsync(string countryCode, int yearA, int yearB, IReadOnlyCollection<FireType> types, CancellationToken ct = default);
}

public class StatisticsService(
    AppDbContext db,
    ICountryLookup countries,
    IFireBlockLocator blocks,
    IMemoryCache cache) : IStatisticsService
{
    public async Task<IReadOnlyList<MonthlyRow>?> GetMonthlyAsync(
        string countryCode, int year, IReadOnlyCollection<FireType> types, CancellationToken ct = default)
    {
        int? countryId = await countries.FindIdAsync(countryCode, ct);
        if (countryId is null) return null;

        return await MonthlyForYearAsync(countryId.Value, year, types, ct);
    }

    public async Task<IReadOnlyList<MonthlyRow>?> CompareYearsAsync(
        string countryCode, int yearA, int yearB, IReadOnlyCollection<FireType> types, CancellationToken ct = default)
    {
        int? countryId = await countries.FindIdAsync(countryCode, ct);
        if (countryId is null) return null;

        var a = await MonthlyForYearAsync(countryId.Value, yearA, types, ct);
        var b = await MonthlyForYearAsync(countryId.Value, yearB, types, ct);
        return [.. a, .. b];
    }

    private async Task<IReadOnlyList<MonthlyRow>> MonthlyForYearAsync(
        int countryId, int year, IReadOnlyCollection<FireType> types, CancellationToken ct)
    {
        var typeArray = types.Distinct().Order().ToArray();
        string key = $"monthly:{countryId}:{year}:{string.Join(',', typeArray)}";

        return (await cache.GetOrCreateAsync(key, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(12);

            var from = new DateTime(year, 1, 1);
            var to = from.AddYears(1);
            var counts = new int[12];

            // Only the Id ranges of this country that contain this year are read (usually 1-3 CSV files).
            foreach (var block in (await blocks.GetBlocksAsync(countryId, ct)).Where(b => b.Overlaps(year)))
            {
                var perMonth = await db.FireData.AsNoTracking()
                    .Where(f => f.Id >= block.StartId && f.Id <= block.EndId)
                    .Where(f => f.AcquiredAt >= from && f.AcquiredAt < to)
                    .Where(f => typeArray.Contains(f.Type))
                    .GroupBy(f => f.AcquiredAt.Month)
                    .Select(g => new { Month = g.Key, Count = g.Count() })
                    .ToListAsync(ct);

                foreach (var m in perMonth) counts[m.Month - 1] += m.Count;
            }

            return (IReadOnlyList<MonthlyRow>)Enumerable.Range(1, 12)
                .Select(month => new MonthlyRow(year, month, counts[month - 1]))
                .ToList();
        }))!;
    }
}
