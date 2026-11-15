using HSH.Core.DTOs;
using HSH.Core.Services;
using HSH.Data.Enums;
using Microsoft.AspNetCore.Mvc;

namespace HSH.API.Controllers;

/// <summary>Data for the client's Statistics page.</summary>
[ApiController]
[Route("api/statistics")]
[Produces("application/json")]
public class StatisticsController(IStatisticsService statistics) : ControllerBase
{
    private const int MinYear = 2000;
    private const int MaxYear = 2100;

    /// <summary>Hotspots per month in one year ("Per month in one year" chart).</summary>
    /// <param name="country">ISO 3166-1 alpha-2 country code, e.g. "BG".</param>
    /// <param name="year">The year, e.g. 2025.</param>
    /// <param name="types">Comma-separated fire types: vegetation, volcano, human, gas. Leave empty for all.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>12 rows, January to December.</returns>
    [HttpGet("{country}/monthly")]
    [ProducesResponseType<IReadOnlyList<MonthlyRow>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<MonthlyRow>>> GetMonthly(
        string country,
        [FromQuery] int year,
        [FromQuery] string? types,
        CancellationToken ct
    )
    {
        if (!ValidYear(year))
            return YearProblem(nameof(year));
        if (!FireTypeNames.TryParse(types, out var fireTypes, out var invalid))
            return TypeProblem(invalid);

        var rows = await statistics.GetMonthlyAsync(country, year, fireTypes, ct);
        return rows is null ? CountryNotFound(country) : Ok(rows);
    }

    /// <summary>Hotspots per month for two years ("Compare two years" chart).</summary>
    /// <param name="country">ISO 3166-1 alpha-2 country code, e.g. "BG".</param>
    /// <param name="yearA">First year, e.g. 2024.</param>
    /// <param name="yearB">Second year, e.g. 2025. Must differ from yearA.</param>
    /// <param name="types">Comma-separated fire types: vegetation, volcano, human, gas. Leave empty for all.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>24 rows: the 12 months of yearA, then the 12 months of yearB.</returns>
    [HttpGet("{country}/compare")]
    [ProducesResponseType<IReadOnlyList<MonthlyRow>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<MonthlyRow>>> CompareYears(
        string country,
        [FromQuery] int yearA,
        [FromQuery] int yearB,
        [FromQuery] string? types,
        CancellationToken ct
    )
    {
        if (!ValidYear(yearA))
            return YearProblem(nameof(yearA));
        if (!ValidYear(yearB))
            return YearProblem(nameof(yearB));
        if (yearA == yearB)
            return Problem(
                "You cannot select the same year twice.",
                statusCode: StatusCodes.Status400BadRequest
            );
        if (!FireTypeNames.TryParse(types, out var fireTypes, out var invalid))
            return TypeProblem(invalid);

        var rows = await statistics.CompareYearsAsync(country, yearA, yearB, fireTypes, ct);
        return rows is null ? CountryNotFound(country) : Ok(rows);
    }

    /// <summary>Hotspots per month in one year, split into MODIS and VIIRS ("MODIS vs VIIRS" chart).</summary>
    /// <param name="country">ISO 3166-1 alpha-2 country code, e.g. "BG".</param>
    /// <param name="year">The year, e.g. 2025.</param>
    /// <param name="types">Comma-separated fire types: vegetation, volcano, human, gas. Leave empty for all.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>12 rows, January to December.</returns>
    [HttpGet("{country}/instruments")]
    [ProducesResponseType<IReadOnlyList<InstrumentMonthlyRow>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<InstrumentMonthlyRow>>> GetInstruments(
        string country,
        [FromQuery] int year,
        [FromQuery] string? types,
        CancellationToken ct
    )
    {
        if (!ValidYear(year))
            return YearProblem(nameof(year));
        if (!FireTypeNames.TryParse(types, out var fireTypes, out var invalid))
            return TypeProblem(invalid);

        var rows = await statistics.GetInstrumentsAsync(country, year, fireTypes, ct);
        return rows is null ? CountryNotFound(country) : Ok(rows);
    }

    // get top 25 hotties
    [HttpGet("{country}/top-fires")]
    [ProducesResponseType<IReadOnlyList<TopFireDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<TopFireDto>>> GetTopFires(
        string country, [FromQuery] int year, [FromQuery] int? month, [FromQuery] string? types,
        [FromQuery] string? instrument, CancellationToken ct, [FromQuery] int limit = 25)
    {
        if (!ValidYear(year)) return YearProblem(nameof(year));
        if (month is < 1 or > 12)
            return Problem("'month' must be between 1 and 12.", statusCode: StatusCodes.Status400BadRequest);
        if (limit is < 1 or > 100)
            return Problem("'limit' must be between 1 and 100.", statusCode: StatusCodes.Status400BadRequest);
        if (!FireTypeNames.TryParse(types, out var fireTypes, out var invalid)) return TypeProblem(invalid);

        Instrument? parsedInstrument = null;
        if (!string.IsNullOrWhiteSpace(instrument))
        {
            if (!Enum.TryParse<Instrument>(instrument, ignoreCase: true, out var value) || !Enum.IsDefined(value))
                return Problem($"Unknown instrument '{instrument}'. Use modis or viirs.", statusCode: StatusCodes.Status400BadRequest);
            parsedInstrument = value;
        }

        var rows = await statistics.GetTopFiresAsync(country, year, month, fireTypes, parsedInstrument, limit, ct);
        return rows is null ? CountryNotFound(country) : Ok(rows);
    }

    /// <summary>Hotspots per calendar month, added up over a range of years ("Fires by month (seasonality)" chart).</summary>
    /// <param name="country">ISO 3166-1 alpha-2 country code, e.g. "BG".</param>
    /// <param name="from">First year of the range, e.g. 2001.</param>
    /// <param name="to">Last year of the range, e.g. 2025. Must not be before from.</param>
    /// <param name="types">Comma-separated fire types: vegetation, volcano, human, gas. Leave empty for all.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>12 rows, January to December.</returns>
    [HttpGet("{country}/seasonality")]
    [ProducesResponseType<IReadOnlyList<SeasonalityRow>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<SeasonalityRow>>> GetSeasonality(
        string country,
        [FromQuery] int from,
        [FromQuery] int to,
        [FromQuery] string? types,
        CancellationToken ct
    )
    {
        if (!ValidYear(from))
            return YearProblem(nameof(from));
        if (!ValidYear(to))
            return YearProblem(nameof(to));
        if (from > to)
            return Problem("'from' must not be after 'to'.", statusCode: StatusCodes.Status400BadRequest);
        if (!FireTypeNames.TryParse(types, out var fireTypes, out var invalid))
            return TypeProblem(invalid);

        var rows = await statistics.GetSeasonalityAsync(country, from, to, fireTypes, ct);
        return rows is null ? CountryNotFound(country) : Ok(rows);
    }

    /// <summary>Hotspots of one year seen by day and by night, all fire types ("Day vs night detections" chart).</summary>
    /// <param name="country">ISO 3166-1 alpha-2 country code, e.g. "BG".</param>
    /// <param name="year">The year, e.g. 2025.</param>
    /// <param name="ct">Cancellation token.</param>
    [HttpGet("{country}/daynight")]
    [ProducesResponseType<DayNightDTO>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDayVsNight(string country, [FromQuery] int year, CancellationToken ct)
    {
        if (!ValidYear(year))
            return YearProblem(nameof(year));

        try
        {
            return Ok(await statistics.GetDayNight(country, year, ct));
        }
        catch (ArgumentException)
        {
            return CountryNotFound(country);
        }
    }

    [HttpGet("{country}/confidence")]
    public async Task<IActionResult> GetConfidence(string country, [FromQuery] int year)
    {
        if (!ValidYear(year))
            return YearProblem(nameof(year));

        DetectionConfidenceDTO dto;

        try
        {
            dto = await statistics.GetDetectionConfidence(country, year);
        }
        catch(ArgumentException ae)
        {
            return BadRequest(ae.Message);
        }

        return Ok(dto);
    }

    private static bool ValidYear(int year) => year is >= MinYear and <= MaxYear;

    private ObjectResult YearProblem(string name) =>
        Problem(
            $"'{name}' must be a year between {MinYear} and {MaxYear}.",
            statusCode: StatusCodes.Status400BadRequest
        );

    private ObjectResult TypeProblem(string? invalid) =>
        Problem(
            $"Unknown fire type '{invalid}'. Use vegetation, volcano, human or gas.",
            statusCode: StatusCodes.Status400BadRequest
        );

    private ObjectResult CountryNotFound(string country) =>
        Problem($"Unknown country code '{country}'.", statusCode: StatusCodes.Status404NotFound);
}
