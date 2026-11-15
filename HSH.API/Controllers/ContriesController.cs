using Microsoft.AspNetCore.Mvc;
using HSH.Core.Interfaces;
using HSH.API.Models.Requests;
using HSH.Core.DTOs;
using HSH.Data.Models;

namespace HSH.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CountriesController : ControllerBase
    {
        private readonly ICountryService _countryService;

        public CountriesController(ICountryService countryService)
        {
            _countryService = countryService;
        }

        // GET: api/countries
        [HttpGet]
        public async Task<ActionResult> GetAllCountries()
        {
            var countries = await _countryService.GetAllCountriesAsync();
            return Ok(countries);
        }

        // GET: api/countries/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<List<Country>>> GetCountryById(int id)
        {
            var country = await _countryService.GetCountryByIdAsync(id);
            
            if (country == null)
            {
                return NotFound(new { message = $"Country with ID {id} not found." });
            }
            
            return Ok(country);
        }

        // GET: api/countries/name/France
        [HttpGet("name/{name}")]
        public async Task<ActionResult<List<CountryByNameDTO>>> GetCountryByName(GetFiresByCountryNameRequest request)
        {
            var countries = await _countryService.GetCountryByNameAsync(request.CountryName);

            if (countries == null)
            {
                return NotFound(new { message = $"Country with the name '{request.CountryName}' not found." });
            }

            return Ok(countries);
        }

        // GET: api/countries/fire-summary
        [HttpGet("fire-summary")]
        public async Task<ActionResult<IEnumerable<CountryFireSummaryDto>>> GetGlobalFireSummary()
        {
            var summary = await _countryService.GetGlobalFireSummaryAsync();
            return Ok(summary);
        }
    }
}