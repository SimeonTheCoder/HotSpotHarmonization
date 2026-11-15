using HSH.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HSH.Core.Services;

/// <summary>A contiguous range of FireData Ids that belongs to one country (in practice: one imported CSV file).</summary>
public record FireBlock(long StartId, long EndId, int FirstYear, int LastYear)
{
    public bool Overlaps(int year) => FirstYear <= year && year <= LastYear;
}

public interface IFireBlockLocator
{
    Task<IReadOnlyList<FireBlock>> GetBlocksAsync(int countryId, CancellationToken ct = default);
}

/// <summary>
/// FireData was imported one CSV file (= one country, one year, one satellite) at a time, so each file's rows
/// got a contiguous run of Ids. This finds those runs for a country. Every query filters on CountryId and Id,
/// so SQL Server answers it with a quick seek on the existing IX_FireData_CountryId index.
/// Afterwards statistics only read the Id ranges they need instead of all ~549M rows.
/// Results are cached in memory: the historical data does not change.
/// </summary>
public class FireBlockLocator(AppDbContext db, IMemoryCache cache) : IFireBlockLocator
{
    public async Task<IReadOnlyList<FireBlock>> GetBlocksAsync(int countryId, CancellationToken ct = default)
    {
        return (await cache.GetOrCreateAsync($"fire-blocks:{countryId}", async _ =>
            (IReadOnlyList<FireBlock>)await FindBlocksAsync(countryId, ct)))!;
    }

    private async Task<List<FireBlock>> FindBlocksAsync(int countryId, CancellationToken ct)
    {
        var fires = db.FireData.AsNoTracking();
        var blocks = new List<FireBlock>();

        // First row of the country.
        long? start = await fires.Where(f => f.CountryId == countryId).MinAsync(f => (long?)f.Id, ct);

        while (start is not null)
        {
            // The block ends where the next row of any other country begins.
            long startId = start.Value;
            var nextOfOtherCountries = await db.Countries
                .Where(c => c.Id != countryId)
                .Select(c => fires.Where(f => f.CountryId == c.Id && f.Id > startId).Min(f => (long?)f.Id))
                .ToListAsync(ct);
            long next = nextOfOtherCountries.Min() ?? long.MaxValue;

            // Last row of this country before that.
            long endId = (await fires.Where(f => f.CountryId == countryId && f.Id < next).MaxAsync(f => (long?)f.Id, ct))!.Value;

            // Year of the block's first and last row.
            var years = await fires.Where(f => f.Id == startId || f.Id == endId).Select(f => f.AcquiredAt.Year).ToListAsync(ct);
            blocks.Add(new FireBlock(startId, endId, years.Min(), years.Max()));

            // Next block of this country.
            start = await fires.Where(f => f.CountryId == countryId && f.Id > endId).MinAsync(f => (long?)f.Id, ct);
        }

        return blocks;
    }
}
