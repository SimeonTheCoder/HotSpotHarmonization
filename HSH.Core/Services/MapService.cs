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

    public async Task<int> CountFiresCountryPeriodOfTime(
        string countryCode,
        DateOnly start,
        DateOnly end
    )
    {
        CoordinatesResponseDTO[] coordinates = await GetCountryFiresForPeriodOfTime(
            countryCode,
            start,
            end
        );

        HashSet<(float lat, float lon)> processed = coordinates
            .ToList()
            .Select(c =>
                (MathF.Floor(c.Latitude * 100) / 100f, MathF.Floor(c.Longitude * 100) / 100f)
            )
            .ToHashSet();

        int firesCount = 0;

        Queue<(float, float)> neighbors = new();

        while (processed.Count > 0)
        {
            (float lat, float lon) curr = processed.First();
            neighbors.Enqueue(curr);

            while (neighbors.Count > 0)
            {
                (float lat, float lon) node = neighbors.Dequeue();
                processed.Remove(node);

                for (int i = -1; i <= 1; i++)
                {
                    for (int j = -1; j <= 1; j++)
                    {
                        (float, float) point = (node.lat + 0.01f * i, node.lon + 0.01f * j);
                        if (processed.Contains(point))
                        {
                            neighbors.Enqueue(point);
                        }
                    }
                }
            }

            firesCount++;
        }

        return firesCount;
    }

    public async Task<CoordinatesResponseDTO[]> GetCountryFiresForPeriodOfTime(
        string countryCode,
        DateOnly start,
        DateOnly end
    )
    {
        Country country = await DbContext.Countries.FirstAsync((c) => c.CountryCode == countryCode);

        return await DbContext
            .FireData.Where(f =>
                f.CountryId == country.Id
                && DateOnly.FromDateTime(f.AcquiredAt) >= start
                && DateOnly.FromDateTime(f.AcquiredAt) <= end
            )
            .Select(f => new CoordinatesResponseDTO()
            {
                Latitude = (float)f.Latitude,
                Longitude = (float)f.Longitude,
            })
            .ToArrayAsync();
    }
}
