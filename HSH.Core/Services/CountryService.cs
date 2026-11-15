using Microsoft.EntityFrameworkCore;
using HSH.Core.Interfaces; 
using HSH.Core.DTOs;  
using HSH.Data.Data.Models;
using HSH.Data.Data;

namespace HSH.Core.Services
{
    public class CountryService : ICountryService
    {
        private readonly AppDbContext _context;

        public CountryService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Country>> GetAllCountriesAsync()
        {
            return await _context.Countries.ToListAsync();
        }

        public async Task<CountryByIdDto?> GetCountryByIdAsync(int id)
        {
            return await _context.Countries
                .Where(x => x.Id == id)
                .Select(x => new CountryByIdDto
                {
                    CountryName = x.CountryName,
                    CountryCode = x.CountryCode
                })
                .FirstOrDefaultAsync(); 
        }

        public async Task<List<CountryByNameDTO>> GetCountryByNameAsync(string name)
        {
            return await _context.Countries
            .Where(x => x.CountryName.ToLower() == name.ToLower())
            .Select(x => new CountryByNameDTO
            {
                CountryCode = x.CountryCode,
                CountryName = x.CountryName
            }).ToListAsync();

        }

        public async Task<IEnumerable<CountryFireSummaryDto>> GetGlobalFireSummaryAsync()
        {
            return await _context.FireData
                .Include(f => f.Country) 
                .Where(f => f.Country != null)
                .GroupBy(f => new { f.CountryId, f.Country.CountryName })
                .Select(g => new CountryFireSummaryDto
                {
                    CountryId = g.Key.CountryId,
                    CountryName = g.Key.CountryName,
                    TotalFires = g.Count(),
                    AverageTemperatureK = g.Average(f => (double)f.TemperatureK),
                    MaxTemperatureK = g.Max(f => f.TemperatureK)
                })
                .OrderByDescending(s => s.TotalFires)
                .ToListAsync();
        }
    }
}