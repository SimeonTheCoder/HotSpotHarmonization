using HSH.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HSH.API.Services;

public interface ICountryLookup
{
    /// <summary>Returns the Countries.Id for an ISO 3166-1 alpha-2 code ("BG"), or null if unknown.</summary>
    Task<int?> FindIdAsync(string code, CancellationToken ct = default);
}

public class CountryLookup(AppDbContext db, IMemoryCache cache) : ICountryLookup
{
    public async Task<int?> FindIdAsync(string code, CancellationToken ct = default)
    {
        // All countries are loaded once (about 240 rows) and kept in memory.
        var ids = await cache.GetOrCreateAsync("country-ids", async _ =>
            await db.Countries.AsNoTracking()
                .ToDictionaryAsync(c => c.CountryCode, c => c.Id, StringComparer.OrdinalIgnoreCase, ct));

        return ids!.TryGetValue(code.Trim(), out int id) ? id : null;
    }
}
