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
    public class FireDataController : ControllerBase
    {
        private readonly AppDbContext _context;

        public FireDataController(AppDbContext context)
        {
            _context = context;
        }        

        //GET: api/firedata (Get all fires)
        [HttpGet]
        public async Task<ActionResult> GetAllFires()
        {
            var fires = await _context.FireData.ToListAsync();
            return Ok(fires);
        }

        // GET: api/firedata/5 (Get exact fire by ID)
        [HttpGet("{id:int}")]
        public async Task<ActionResult<FireData>> GetFireByID(int id)
        {
            var fire = await _context.FireData.FindAsync(id);
            if (fire == null)
            {
                return NotFound(new { message = $"Fire with ID {id} not found."});

            }
            return Ok(fire);
        }

        // GET: api/firedata/country/3 (Get all fire by Country ID)
        [HttpGet("country/{countryId:int}")]
        public async Task<ActionResult<IEnumerable<FireData>>> GetFiresByCountry(int countryId)
        {
            var fires = await _context.FireData
            .Where(f => f.CountryId == countryId)
            .ToListAsync();

            return Ok(fires);
        }

        //GET: api/firedata/satelite/Modis (Get all fires by Satellite source enum)
        [HttpGet("satellite/{sat}")]
        public async Task<ActionResult<IEnumerable<FireData>>> GetFiresBySatellite(SatelliteSource sat)
        {
            var fires = await _context.FireData.Where(f => f.Sat == sat).ToListAsync();

            return Ok(fires);
        }

        //GET: api/firedata/search?lat=45.1&lon=12.3 (Find exact or nearby match by coordinates)
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<FireData>>> GetFiresByCoordinates([FromQuery] double lat, [FromQuery] double lon)
        {
            var fires = await _context.FireData
            .Where(f => f.Latitude == lat && f.Longitude == lon)
            .ToListAsync();

            return Ok(fires);
        }

        //GET: api/firedata/min-temperature?temp=300 (Get fires above a certain temperature)
        [HttpGet("min-temperature")]
        public async Task<ActionResult<IEnumerable<FireData>>> GetFiresByMinTemperature(float temp)
        {
            var fires = await _context.FireData
            .Where(f => f.TemperatureK >= temp)
            .ToListAsync();

            return Ok(fires);
        }
        

        //GET: api/firedata/country-name/France
        [HttpGet("country-name/{countryName}")]
        public async Task<ActionResult<IEnumerable<FireData>>> GetFiresByCountryName(string countryName)
        {
            var fires = await _context.FireData
            .Include(f => f.Country)
            .Where(f => f.Country != null && f.Country.CountryName.ToLower() == countryName.ToLower())
            .ToListAsync();

            return Ok(fires);
        }

        [HttpGet("country-name/{countryName}/count")]
        public async Task<ActionResult> GetFireCountByCountryName(string countryName)
        {
            var count = await _context.FireData
                .Include(f => f.Country)
                .Where(f => f.Country != null && f.Country.CountryName.ToLower() == countryName.ToLower())
                .CountAsync();

            return Ok(new 
            { 
                Country = countryName, 
                TotalFires = count 
            });
        }

        [HttpPost]
        public async Task<IActionResult> CreateFirePoint([FromBody] CreateFireDataDto dto)
        {
            // 1. Backend logic: Find the CountryId based on coordinates or incoming data
            var country = await _context.Countries
                .FirstOrDefaultAsync(c => c.CountryName == dto.CountryName); // or resolved via logic

            // 2. Backend logic: Find or create the QuadTree cell ID for these coordinates
            var cellId = SpatialHelper.CalculateQuadTreeCell(dto.Latitude, dto.Longitude); 

            // 3. Save to the main Data table
            var fireEntity = new FireData
            {
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                TemperatureK = dto.TemperatureK,
                CountryId = country?.Id ?? 1, // Fallback ID
                Sat = dto.Sat,
                Date = DateTime.UtcNow
            };

            _context.FireData.Add(fireEntity);
            await _context.SaveChangesAsync();

            // 4. Save the relation to the QuadTree table as shown in your diagram
            var quadTreeEntry = new QuadTree
            {
                CellId = cellId,
                FireId = fireEntity.Id,
                CountryId = fireEntity.CountryId
            };
            
            _context.QuadTrees.Add(quadTreeEntry);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Fire point and spatial cell registered successfully!", fireId = fireEntity.Id });
        }
    }
}
