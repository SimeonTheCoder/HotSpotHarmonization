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

    private async Task<Country> GetCountryByCode(string countryCode)
    {
        return await DbContext.Countries.FirstAsync((c) => c.CountryCode == countryCode);
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
        Country country = await GetCountryByCode(countryCode);

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

    private int CheckStatus(
        float x1,
        float y1,
        float x2,
        float y2,
        float bound,
        bool dir,
        bool side,
        int currentStatus
    )
    {
        if (!dir) //vertical
        {
            if (Math.Min(x1, x2) < bound && Math.Max(x1, x2) > bound)
                return Math.Min(currentStatus, 1);
            else
                return ((x1 < bound && x2 < bound) ? !side : side) ? Math.Min(currentStatus, 2) : 0;
        }
        else //horizontal
        {
            if (Math.Min(y1, y2) < bound && Math.Max(y1, y2) > bound)
                return Math.Min(currentStatus, 1);
            else
                return ((y1 < bound && y2 < bound) ? !side : side) ? Math.Min(currentStatus, 2) : 0;
        }
    }

    void Recursion(
        float x1,
        float y1,
        float x2,
        float y2,
        TreeBoundary boundary,
        TreeBoundary[] boundaries,
        int currentStatus,
        int depth,
        List<ushort> toCheck,
        ushort path
    )
    {
        if (depth > 15 || (boundary.LeftChildId == -1 && boundary.RightChildId == -1))
        {
            if (currentStatus != 0)
                toCheck.Add(path);
            return;
        }

        bool parity = depth % 2 != 0;

        int childLeftStatus = CheckStatus(
            x1,
            y1,
            x2,
            y2,
            boundary.Value,
            parity,
            false,
            currentStatus
        );
        int childRightStatus = CheckStatus(
            x1,
            y1,
            x2,
            y2,
            boundary.Value,
            parity,
            true,
            currentStatus
        );

        if (childLeftStatus != 0)
        {
            Recursion(
                x1,
                y1,
                x2,
                y2,
                boundaries[boundary.LeftChildId],
                boundaries,
                childLeftStatus,
                depth + 1,
                toCheck,
                (ushort)(2 * path)
            );
        }

        if (childRightStatus != 0)
        {
            Recursion(
                x1,
                y1,
                x2,
                y2,
                boundaries[boundary.RightChildId],
                boundaries,
                childRightStatus,
                depth + 1,
                toCheck,
                (ushort)(path * 2 + 1)
            );
        }
    }

    public async Task<CoordinatesResponseDTO[]> GetRectCoords(
        string countryCode,
        float x1,
        float y1,
        float x2,
        float y2
    )
    {
        Country country = await GetCountryByCode(countryCode);

        TreeBoundary[] boundaries = await DbContext
            .TreeBoundaries.Where(b => b.TreeId == country.Id)
            .ToArrayAsync();
        boundaries.Sort((a, b) => a.BoundaryId.CompareTo(b.BoundaryId));

        List<ushort> toCheck = new();
        Recursion(x1, y1, x2, y2, boundaries[0], boundaries, 2, 0, toCheck, 0);

        System.Console.WriteLine("Calculations done!");

        toCheck.Sort();
        System.Console.WriteLine(string.Join(", ", toCheck));

        var results = await DbContext
            .FireData.Where(f => f.CountryId == country.Id)
            .Where(f =>
                DbContext.QuadTrees.Any(q =>
                    q.CountryId == country.Id && q.FireId == f.Id && toCheck.Contains(q.CellId)
                )
            )
            .Select(f => new CoordinatesResponseDTO()
            {
                Latitude = (float)f.Latitude,
                Longitude = (float)f.Longitude,
            })
            .ToArrayAsync();

        return results;
    }
}
