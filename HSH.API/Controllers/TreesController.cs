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
    public class TreesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TreesController(AppDbContext context)
        {
            _context = context;
        }        


        // GET: api/trees/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<TreeBoundary>> GetTreeById(int id)
        {
            var tree = await _context.TreeBoundaries.FindAsync(id);
            
            if (tree == null)
            {
                return NotFound(new { message = $"Tree boundary with ID {id} not found." });
            }
            
            return Ok(tree);
        }

        // GET: api/trees/high-vulnerability?threshold=50.0
        [HttpGet("high-vulnerability")]
        public async Task<ActionResult<IEnumerable<TreeBoundary>>> GetHighVulnerabilityTrees([FromQuery] float threshold = 50.0f)
        {
            // Query trees where the vulnerability value is greater than or equal to the threshold
            var vulnerableTrees = await _context.TreeBoundaries
                .Where(t => t.Value >= threshold)
                .OrderByDescending(t => t.Value) // Shows the most vulnerable trees first
                .ToListAsync();

            return Ok(vulnerableTrees);
        }
    }
}
