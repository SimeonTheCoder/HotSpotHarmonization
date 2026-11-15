using Microsoft.EntityFrameworkCore;
using HSH.Core.Interfaces; 
using HSH.Data;
using HSH.Core.DTOs;
using HSH.Data.Enums;
namespace HSH.Core.Services
{
    public class FireService : IFireService
    {
        private readonly AppDbContext _context;

        public FireService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<FireDataResponseDto>> GetTop25HottestFiresByCountryAsync(
            string countryName, 
            DateTime startDate, 
            DateTime endDate, 
            FireType? fireType = null)
        {
            var query = _context.FireData
                .Include(f => f.Country)
                .Where(f => f.Country != null && 
                            f.Country.CountryName.ToLower() == countryName.ToLower() &&
                            f.AcquiredAt >= startDate && 
                            f.AcquiredAt <= endDate &&
                            f.Brightness.HasValue);

            // Optional filter by fire type range if provided
            if (fireType.HasValue)
            {
                query = query.Where(f => f.Type == fireType.Value);
            }

            return await query
                .OrderByDescending(f => f.Brightness) // Hottest first
                .Take(25)                             // Top 25 limit
                .Select(f => new FireDataResponseDto
                {
                    Id = f.Id,
                    Latitude = f.Latitude,
                    Longitude = f.Longitude,
                    Brightness = f.Brightness,
                    AcquiredAt = f.AcquiredAt,
                    CountryName = f.Country.CountryName,
                    Satellite = f.Satellite.ToString(),
                    Type = f.Type.ToString()
                })
                .ToListAsync();
        }
    }
}