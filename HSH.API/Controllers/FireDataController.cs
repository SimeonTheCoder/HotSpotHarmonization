using HSH.Data;
using HSH.Data.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HSH.API.Helpers;
using HSH.Core.DTOs; 
using HSH.Data.Enums;
using HSH.Core.Interfaces;

namespace HSH.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FireDataController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IFireService _fireDataService; 

        public FireDataController(AppDbContext context, IFireService fireDataService)
        {
            _context = context;
            _fireDataService = fireDataService; 
        }       

        // GET: api/firedata (Get all fires with Country info)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<FireData>>> GetAllFires()
        {
            var fires = await _context.FireData
                .Include(f => f.Country)
                .Include(f => f.Tree)
                .ToListAsync();
            return Ok(fires);
        }

        // GET: api/firedata/5 (Get exact fire by ID)
        [HttpGet("{id:long}")]
        public async Task<ActionResult<FireData>> GetFireByID(long id)
        {
            var fire = await _context.FireData
                .Include(f => f.Country)
                .Include(f => f.Tree)
                .FirstOrDefaultAsync(f => f.Id == id);

            if (fire == null)
            {
                return NotFound(new { message = $"Fire with ID {id} not found." });
            }
            return Ok(fire);
        }

        // GET: api/firedata/country/3 (Get all fires by Country ID)
        [HttpGet("country/{countryId:int}")]
        public async Task<ActionResult<IEnumerable<FireData>>> GetFiresByCountry(int countryId)
        {
            var fires = await _context.FireData
                .Include(f => f.Country)
                .Where(f => f.CountryId == countryId)
                .ToListAsync();

            return Ok(fires);
        }

        // GET: api/firedata/satellite/Modis (Get all fires by Satellite source enum)
        [HttpGet("satellite/{sat}")]
        public async Task<ActionResult<IEnumerable<FireData>>> GetFiresBySatellite(Satellite sat)
        {
            var fires = await _context.FireData
                .Include(f => f.Country)
                .Where(f => f.Satellite == sat)
                .ToListAsync();

            return Ok(fires);
        }

        [HttpGet("country-name/{countryName}")]
        public async Task<ActionResult<IEnumerable<FireDataResponseDto>>> GetAllFiresByCountry(string countryName)
        {
            var fires = await _fireDataService.GetAllFiresByCountryAsync(countryName);
            return Ok(fires);
        }

        // GET: api/firedata/country-code/FR/hottest-fires?startDate=2026-01-01&endDate=2026-12-31&fireType=1
        [HttpGet("country-code/{countryCode}/hottest-fires")]
        public async Task<ActionResult<IEnumerable<FireDataResponseDto>>> GetTop25HottestFires(
            string countryCode,
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate,
            [FromQuery] FireType? fireType = null)
        {
            if (startDate > endDate)
            {
                return BadRequest(new { message = "StartDate cannot be later than EndDate." });
            }

            var hottestFires = await _fireDataService.GetTop25HottestFiresByCountryCodeAsync(
                countryCode, 
                startDate, 
                endDate, 
                fireType);

            return Ok(hottestFires);
        }


        // GET: api/firedata/search?lat=45.1&lon=12.3 (Find exact match by coordinates)
        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<FireData>>> GetFiresByCoordinates([FromQuery] double lat, [FromQuery] double lon)
        {
            var fires = await _context.FireData
                .Include(f => f.Country)
                .Where(f => f.Latitude == lat && f.Longitude == lon)
                .ToListAsync();

            return Ok(fires);
        }

        // GET: api/firedata/min-temperature?temp=300 (Get fires above a certain brightness temperature)
        [HttpGet("min-temperature")]
        public async Task<ActionResult<IEnumerable<FireData>>> GetFiresByMinTemperature([FromQuery] float temp)
        {
            var fires = await _context.FireData
                .Include(f => f.Country)
                .Where(f => f.Brightness >= temp)
                .ToListAsync();

            return Ok(fires);
        }

        // GET: api/firedata/country-name/France/count
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

       // POST: api/firedata
        [HttpPost]
        public async Task<IActionResult> CreateFirePoint([FromBody] CreateFireDataDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // 1. Resolve CountryId: check DTO CountryId, or lookup by CountryName if provided
            int resolvedCountryId = dto.CountryId;
            if (resolvedCountryId == 0 && !string.IsNullOrEmpty(dto.CountryName))
            {
                var country = await _context.Countries
                    .FirstOrDefaultAsync(c => c.CountryName.ToLower() == dto.CountryName.ToLower());
                
                if (country != null)
                {
                    resolvedCountryId = country.Id;
                }
            }

            // Fallback safety check if country is still invalid
            if (resolvedCountryId == 0)
            {
                resolvedCountryId = 1; 
            }

            // 2. Calculate QuadTree cell ID (assuming it returns a string representation that needs conversion to ushort)
            var rawCellId = SpatialHelper.CalculateQuadTreeCell(dto.Latitude, dto.Longitude); 
            
            // Convert string to ushort safely (or use ushort.Parse(rawCellId) if you are certain it's a valid numeric string)
            ushort cellId = 0;
            if (!ushort.TryParse(rawCellId, out cellId))
            {
                // Fallback or handle if the quadtree helper returns a non-numeric string identifier
                cellId = 1; 
            }

            // 3. Map DTO fields to the FireData entity model
            var fireEntity = new FireData
            {
                TreeId = dto.TreeID,
                CountryId = resolvedCountryId,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                Satellite = (Satellite)dto.Sat, // Map SatelliteSource to Satellite enum
                Brightness = dto.TemperatureK,  // Map TemperatureK to Brightness
                Type = (FireType)dto.Type,      // Cast int Type to FireType enum
                AcquiredAt = dto.Date,          // Map DTO Date to AcquiredAt datetime2 property
                Scan = (float)dto.PixelSize,    // Storing PixelSize as Scan representation
                Track = (float)dto.PixelSize    // Storing PixelSize as Track representation
            };

            _context.FireData.Add(fireEntity);
            await _context.SaveChangesAsync();

            // 4. Save the relation to the QuadTree table
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