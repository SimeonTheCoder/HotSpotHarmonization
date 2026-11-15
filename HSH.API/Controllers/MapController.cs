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

    [HttpGet("{countryCode}/count")]
    public async Task<IActionResult> CountCountryFiresForTimeFrame(
        string countryCode,
        [FromQuery] DateOnly start,
        [FromQuery] DateOnly end
    )
    {
        if (end.DayNumber - start.DayNumber > 31)
            return BadRequest("Time span too large!");

        int result = await service.CountFiresCountryPeriodOfTime(countryCode, start, end);

        return Ok(result);
    }

    [HttpGet("{countryCode}/rect")]
    public async Task<IActionResult> GetCountryRectCoords(
        string countryCode,
        [FromQuery] float x1,
        [FromQuery] float y1,
        [FromQuery] float x2,
        [FromQuery] float y2
    )
    {
        CoordinatesResponseDTO[] result = await service.GetRectCoords(countryCode, x1, x2, y1, y2);
        return Ok(result);
    }
}
