using HSH.Core.DTOs;
using HSH.Core.Services.Contracts;
using HSH.Data;
using HSH.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace HSH.Core.Services.MapService;

public class MapService : IMapService
{
    private readonly AppDbContext DbContext;

    public MapService(AppDbContext dbContext)
    {
        this.DbContext = dbContext;
    }

    public async Task<CoordinatesResponseDTO[]> GetCountryFiresForPeriodOfTime(
        string countryCode,
        DateOnly start,
        DateOnly end
    )
    {
        Country country = await DbContext.Countries.FirstAsync((c) => c.CountryCode == countryCode);

        return await DbContext.FireData.Where(f =>
            f.CountryId == country.Id
            && DateOnly.FromDateTime(f.AcquiredAt) >= start
            && DateOnly.FromDateTime(f.AcquiredAt) <= end
        ).Select(f => new CoordinatesResponseDTO()
        {
            Latitude = (float) f.Latitude,
            Longitude = (float) f.Longitude
        }).ToArrayAsync();
    }
}
