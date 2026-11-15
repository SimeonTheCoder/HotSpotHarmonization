using HSH.Core.DTOs;
using HSH.Data;
using HSH.Data.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HSH.Core.Services;

public interface IStatisticsService
{
    /// <summary>Hotspots per month (always 12 rows) of one country in one year. Null if the country is unknown.</summary>
    Task<IReadOnlyList<MonthlyRow>?> GetMonthlyAsync(
        string countryCode,
        int year,
        IReadOnlyCollection<FireType> types,
        CancellationToken ct = default
    );

    /// <summary>Hotspots per month of one country for two years (24 rows: yearA then yearB). Null if the country is unknown.</summary>
    Task<IReadOnlyList<MonthlyRow>?> CompareYearsAsync(
        string countryCode,
        int yearA,
        int yearB,
        IReadOnlyCollection<FireType> types,
        CancellationToken ct = default
    );

    /// <summary>Hotspots per month (always 12 rows) of one country in one year, split into MODIS and VIIRS. Null if the country is unknown.</summary>
    Task<IReadOnlyList<InstrumentMonthlyRow>?> GetInstrumentsAsync(
        string countryCode,
        int year,
        IReadOnlyCollection<FireType> types,
        CancellationToken ct = default
    );

    Task<DayNightDTO> GetDayNight(string countryCode, int year);
    
    /// <summary>
    /// The hottest fires of one country in one month (or the whole year when month is null), hottest first.
    /// Null if the country is unknown.
    /// </summary>
    Task<IReadOnlyList<TopFireDto>?> GetTopFiresAsync(string countryCode, int year, int? month, IReadOnlyCollection<FireType> types, Instrument? instrument, int limit, CancellationToken ct = default);

    Task<DetectionConfidenceDTO> GetDetectionConfidence(string countryCode, int year);
}

public class StatisticsService(
    AppDbContext db,
    ICountryLookup countries,
    IFireBlockLocator blocks,
    IMemoryCache cache
) : IStatisticsService
{
    public async Task<IReadOnlyList<MonthlyRow>?> GetMonthlyAsync(
        string countryCode,
        int year,
        IReadOnlyCollection<FireType> types,
        CancellationToken ct = default
    )
    {
        int? countryId = await countries.FindIdAsync(countryCode, ct);
        if (countryId is null)
            return null;

        return await MonthlyForYearAsync(countryId.Value, year, types, ct);
    }

    public async Task<IReadOnlyList<MonthlyRow>?> CompareYearsAsync(
        string countryCode,
        int yearA,
        int yearB,
        IReadOnlyCollection<FireType> types,
        CancellationToken ct = default
    )
    {
        int? countryId = await countries.FindIdAsync(countryCode, ct);
        if (countryId is null)
            return null;

        var a = await MonthlyForYearAsync(countryId.Value, yearA, types, ct);
        var b = await MonthlyForYearAsync(countryId.Value, yearB, types, ct);
        return [.. a, .. b];
    }

    public async Task<IReadOnlyList<InstrumentMonthlyRow>?> GetInstrumentsAsync(
        string countryCode,
        int year,
        IReadOnlyCollection<FireType> types,
        CancellationToken ct = default
    )
    {
        int? countryId = await countries.FindIdAsync(countryCode, ct);
        if (countryId is null)
            return null;

        var typeArray = types.Distinct().Order().ToArray();
        string key = $"instruments:{countryId}:{year}:{string.Join(',', typeArray)}";

        return (
            await cache.GetOrCreateAsync(
                key,
                async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(12);

                    var from = new DateTime(year, 1, 1);
                    var to = from.AddYears(1);
                    var modis = new int[12];
                    var viirs = new int[12];

                    foreach (
                        var block in (await blocks.GetBlocksAsync(countryId.Value, ct)).Where(b =>
                            b.Overlaps(year)
                        )
                    )
                    {
                        var perMonth = await db
                            .FireData.AsNoTracking()
                            .Where(f => f.Id >= block.StartId && f.Id <= block.EndId)
                            .Where(f => f.AcquiredAt >= from && f.AcquiredAt < to)
                            .Where(f => typeArray.Contains(f.Type))
                            .GroupBy(f => new { f.AcquiredAt.Month, f.Instrument })
                            .Select(g => new
                            {
                                g.Key.Month,
                                g.Key.Instrument,
                                Count = g.Count(),
                            })
                            .ToListAsync(ct);

                        foreach (var m in perMonth)
                        {
                            if (m.Instrument == Instrument.Modis)
                                modis[m.Month - 1] += m.Count;
                            else if (m.Instrument == Instrument.Viirs)
                                viirs[m.Month - 1] += m.Count;
                        }
                    }

                    return (IReadOnlyList<InstrumentMonthlyRow>)
                        Enumerable
                            .Range(1, 12)
                            .Select(month => new InstrumentMonthlyRow(
                                year,
                                month,
                                modis[month - 1],
                                viirs[month - 1]
                            ))
                            .ToList();
                }
            )
        )!;
    }

    public async Task<IReadOnlyList<TopFireDto>?> GetTopFiresAsync(
        string countryCode, int year, int? month, IReadOnlyCollection<FireType> types, Instrument? instrument, int limit,
        CancellationToken ct = default)
    {
        int? countryId = await countries.FindIdAsync(countryCode, ct);
        if (countryId is null) return null;

        var typeArray = types.Distinct().Order().ToArray();
        string key = $"top-fires:{countryId}:{year}:{month}:{string.Join(',', typeArray)}:{instrument}:{limit}";

        return (await cache.GetOrCreateAsync(key, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(12);

            var from = month is null ? new DateTime(year, 1, 1) : new DateTime(year, month.Value, 1);
            var to = month is null ? from.AddYears(1) : from.AddMonths(1);
            var found = new List<TopFireDto>();

            // Each Id range of the country gives its own top N; the best N of all ranges are kept.
            foreach (var block in (await blocks.GetBlocksAsync(countryId.Value, ct)).Where(b => b.Overlaps(year)))
            {
                var query = db.FireData.AsNoTracking()
                    .Where(f => f.Id >= block.StartId && f.Id <= block.EndId)
                    .Where(f => f.CountryId == countryId.Value)
                    .Where(f => f.AcquiredAt >= from && f.AcquiredAt < to)
                    .Where(f => typeArray.Contains(f.Type));
                if (instrument is not null) query = query.Where(f => f.Instrument == instrument.Value);

                var rows = await query
                    // MODIS has "brightness", VIIRS has "bright_ti4": both are the fire pixel's temperature
                    .OrderByDescending(f => f.Brightness ?? f.BrightTi4)
                    .ThenByDescending(f => f.Frp)
                    .Take(limit)
                    .ToListAsync(ct);

                found.AddRange(rows.Select(f => new TopFireDto
                {
                    Id = f.Id,
                    Latitude = f.Latitude,
                    Longitude = f.Longitude,
                    AcquiredAt = f.AcquiredAt,
                    Satellite = SatelliteName(f.Satellite),
                    Instrument = f.Instrument == Instrument.Viirs ? "VIIRS" : "MODIS",
                    Temperature = f.Brightness ?? f.BrightTi4,
                    Brightness = f.Brightness,
                    BrightT31 = f.BrightT31,
                    BrightTi4 = f.BrightTi4,
                    BrightTi5 = f.BrightTi5,
                    Scan = f.Scan,
                    Track = f.Track,
                    Frp = f.Frp,
                    ConfidencePercent = f.ConfidencePercent,
                    ConfidenceLevel = f.ConfidenceLevel?.ToString().ToLowerInvariant(),
                    Version = f.Version,
                    DayNight = f.DayNight == DayNight.Day ? "D" : "N",
                    Type = (int)f.Type,
                }));
            }

            return (IReadOnlyList<TopFireDto>)found
                .OrderByDescending(f => f.Temperature ?? float.MinValue)
                .ThenByDescending(f => f.Frp)
                .Take(limit)
                .ToList();
        }))!;
    }

    private static string SatelliteName(Satellite satellite) => satellite switch
    {
        Satellite.Terra => "Terra",
        Satellite.Aqua => "Aqua",
        Satellite.SuomiNpp => "N",
        Satellite.Noaa20 => "N20",
        Satellite.Noaa21 => "N21",
        _ => satellite.ToString(),
    };

    private async Task<IReadOnlyList<MonthlyRow>> MonthlyForYearAsync(
        int countryId,
        int year,
        IReadOnlyCollection<FireType> types,
        CancellationToken ct
    )
    {
        var typeArray = types.Distinct().Order().ToArray();
        string key = $"monthly:{countryId}:{year}:{string.Join(',', typeArray)}";

        return (
            await cache.GetOrCreateAsync(
                key,
                async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(12);

                    var from = new DateTime(year, 1, 1);
                    var to = from.AddYears(1);
                    var counts = new int[12];

                    // Only the Id ranges of this country that contain this year are read (usually 1-3 CSV files).
                    foreach (
                        var block in (await blocks.GetBlocksAsync(countryId, ct)).Where(b =>
                            b.Overlaps(year)
                        )
                    )
                    {
                        var perMonth = await db
                            .FireData.AsNoTracking()
                            .Where(f => f.Id >= block.StartId && f.Id <= block.EndId)
                            .Where(f => f.AcquiredAt >= from && f.AcquiredAt < to)
                            .Where(f => typeArray.Contains(f.Type))
                            .GroupBy(f => f.AcquiredAt.Month)
                            .Select(g => new { Month = g.Key, Count = g.Count() })
                            .ToListAsync(ct);

                        foreach (var m in perMonth)
                            counts[m.Month - 1] += m.Count;
                    }

                    return (IReadOnlyList<MonthlyRow>)
                        Enumerable
                            .Range(1, 12)
                            .Select(month => new MonthlyRow(year, month, counts[month - 1]))
                            .ToList();
                }
            )
        )!;
    }

    public async Task<DayNightDTO> GetDayNight(string countryCode, int year)
    {
        int? countryId = await countries.FindIdAsync(countryCode);
        if (countryId == null)
            throw new ArgumentException("Invalid country!");

        int dayFires = await db
            .FireData.AsNoTracking()
            .CountAsync(f =>
                f.CountryId == countryId && f.AcquiredAt.Year == year && f.DayNight == DayNight.Day
            );

        int nightFires = await db
            .FireData.AsNoTracking()
            .CountAsync(f =>
                f.CountryId == countryId
                && f.AcquiredAt.Year == year
                && f.DayNight == DayNight.Night
            );

        return new DayNightDTO(dayFires, nightFires);
    }

    public async Task<DetectionConfidenceDTO> GetDetectionConfidence(string countryCode, int year)
    {
        int? countryId = await countries.FindIdAsync(countryCode);
        if (countryId == null)
            throw new ArgumentException("Invalid country!");

        int low = await db.FireData.AsNoTracking().Where(f => f.CountryId == countryId).CountAsync(f => f.ConfidenceLevel == ConfidenceLevel.Low || f.ConfidencePercent <= 30);
        int nominal = await db.FireData.AsNoTracking().Where(f => f.CountryId == countryId).CountAsync(f => f.ConfidenceLevel == ConfidenceLevel.Nominal || (f.ConfidencePercent > 30 && f.ConfidencePercent <= 80));
        int high = await db.FireData.AsNoTracking().Where(f => f.CountryId == countryId).CountAsync(f => f.ConfidenceLevel == ConfidenceLevel.High || f.ConfidencePercent > 80); 

        return new DetectionConfidenceDTO(low, nominal, high);
    }
}
