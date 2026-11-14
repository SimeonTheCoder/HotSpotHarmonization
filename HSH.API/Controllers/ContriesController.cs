using HSH.Data;
using HSH.Data.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HSH.API.Helpers;
using HSH.API.DTOs;
namespace HSH.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ContriesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ContriesController(AppDbContext context)
        {
            _context = context;
        }        

        //GET: all the countries
        [HttpGet]
        public async Task<ActionResult> GetAllCounties()
        {
            
            var countries = await _context.Countries.ToListAsync();

            return Ok(countries);
        }

        // 1. GET: api/countries/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Country>> GetCountryById(int id)
        {
            var country = await _context.Countries.FindAsync(id);
            
            if (country == null)
            {
                return NotFound(new { message = $"Country with ID {id} not found." });
            }
            
            return Ok(country);
        }

        // 2. GET: api/countries/name/France
        [HttpGet("name/{name}")]
        public async Task<ActionResult<Country>> GetCountryByName(string name)
        {
            // Use FirstOrDefaultAsync for a single item lookup safely
            var country = await _context.Countries
                .FirstOrDefaultAsync(c => c.CountryName.ToLower() == name.ToLower());

            if (country == null)
            {
                return NotFound(new { message = $"Country with the name '{name}' not found." });
            }

            return Ok(country);
        }

        // GET: api/countries/fire-summary
        [HttpGet("fire-summary")]
        public async Task<ActionResult<IEnumerable<CountryFireSummaryDto>>> GetGlobalFireSummary()
        {
            var summary = await _context.FireData
                .Include(f => f.Country) 
                .Where(f => f.Country != null)
                .GroupBy(f => new { f.CountryId, f.Country.CountryName })
                .Select(g => new CountryFireSummaryDto
                {
                    CountryId = g.Key.CountryId,
                    CountryName = g.Key.CountryName,
                    TotalFires = g.Count(),                               // Count total fires in this country
                    AverageTemperatureK = g.Average(f => (double)f.TemperatureK), // Calculate average temperature
                    MaxTemperatureK = g.Max(f => f.TemperatureK)          // Find the hottest fire point
                })
                .OrderByDescending(s => s.TotalFires) // Sort so the country with the most fires is at the top
                .ToListAsync();

            return Ok(summary);
        }
    }
}
