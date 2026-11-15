using HSH.Core.Services.Heatmap;
using Microsoft.AspNetCore.Mvc;

namespace HSH.API.Controllers;

/// <summary>The world fire-density heatmap that the map page can show as an overlay.</summary>
[ApiController]
[Route("api/heatmap")]
public class HeatmapController(IHeatmapService heatmap) : ControllerBase
{
    /// <summary>
    /// The heatmap as a transparent PNG in Web Mercator, covering longitude -180..180 and latitude -85.0511..85.0511.
    /// The first call starts building it and answers 202 with the status; ask again until it answers 200.
    /// </summary>
    [HttpGet]
    [Produces("image/png", "application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<HeatmapStatus>(StatusCodes.Status202Accepted)]
    public IActionResult GetImage()
    {
        byte[]? png = heatmap.GetImageOrStart();
        if (png is null) return Accepted(heatmap.GetStatus());

        Response.Headers.CacheControl = "public, max-age=3600";
        return File(png, "image/png");
    }

    /// <summary>Whether the heatmap is ready, being built, or failed (does not start building it).</summary>
    [HttpGet("status")]
    [ProducesResponseType<HeatmapStatus>(StatusCodes.Status200OK)]
    public ActionResult<HeatmapStatus> GetStatus() => heatmap.GetStatus();
}
