namespace HSH.Core.DTOs;

/// <summary>One fire detection with all its FIRMS columns, for the "Detailed stats" list of the Statistics page.</summary>
public record TopFireDto
{
    public long Id { get; init; }
    public double Latitude { get; init; }
    public double Longitude { get; init; }

    /// <summary>acq_date + acq_time (UTC).</summary>
    public DateTime AcquiredAt { get; init; }

    /// <summary>"Terra", "Aqua", "N", "N20" or "N21".</summary>
    public string Satellite { get; init; } = "";

    /// <summary>"MODIS" or "VIIRS".</summary>
    public string Instrument { get; init; } = "";

    /// <summary>Temperature used for sorting (K): MODIS "brightness", VIIRS "bright_ti4".</summary>
    public float? Temperature { get; init; }

    /// <summary>MODIS only: "brightness" (K).</summary>
    public float? Brightness { get; init; }

    /// <summary>MODIS only: "bright_t31" (K).</summary>
    public float? BrightT31 { get; init; }

    /// <summary>VIIRS only: "bright_ti4" (K).</summary>
    public float? BrightTi4 { get; init; }

    /// <summary>VIIRS only: "bright_ti5" (K).</summary>
    public float? BrightTi5 { get; init; }

    public float Scan { get; init; }
    public float Track { get; init; }

    /// <summary>Fire radiative power (MW).</summary>
    public float Frp { get; init; }

    /// <summary>MODIS only: confidence 0-100 %.</summary>
    public byte? ConfidencePercent { get; init; }

    /// <summary>VIIRS only: "low", "nominal" or "high".</summary>
    public string? ConfidenceLevel { get; init; }

    public float Version { get; init; }

    /// <summary>"D" or "N".</summary>
    public string DayNight { get; init; } = "";

    /// <summary>FIRMS type: 0 vegetation fire, 1 active volcano, 2 other static land source, 3 offshore.</summary>
    public int Type { get; init; }
}
