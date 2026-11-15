using HSH.Core.DTOs;
using HSH.Core.Services.Contracts;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("/api/[controller]")]
public class MapController : ControllerBase
{
    private readonly IMapService service;

    public MapController(IMapService service)
    {
        this.service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Test()
    {
        return Ok();
    }

    [HttpGet("{countryCode}")]
    public async Task<IActionResult> GetCountryFiresForTimeFrame(
        string countryCode,
        [FromQuery] DateOnly start,
        [FromQuery] DateOnly end
    )
    {
        if (end.DayNumber - start.DayNumber > 31)
            return BadRequest("Time span too large!");

        CoordinatesResponseDTO[] result = await service.GetCountryFiresForPeriodOfTime(
            countryCode,
            start,
            end
        );

        return Ok(result);
    }
}
