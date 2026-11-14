using System.ComponentModel.DataAnnotations;
using HSH.Data.Enums;

namespace HSH.Data.Models;

// One row of the FIRMS CSV:
// latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight,type
public class FirePoint
{
    public long Id { get; set; }

    public int CountryId { get; set; }
    public Country Country { get; set; } = null!;

    // Leaf node of the country's quad tree that contains this point
    public long? QuadTreeNodeId { get; set; }
    public QuadTreeNode? QuadTreeNode { get; set; }

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public double BrightTi4 { get; set; }
    public double Scan { get; set; }
    public double Track { get; set; }

    // acq_date + acq_time (HHmm, UTC) combined
    public DateTime AcquiredAtUtc { get; set; }

    [MaxLength(10)]
    public required string Satellite { get; set; }

    [MaxLength(10)]
    public required string Instrument { get; set; }

    // VIIRS: l / n / h, MODIS: 0-100 mapped via ConfidenceParser
    public Confidence Confidence { get; set; }

    [MaxLength(10)]
    public required string Version { get; set; }

    public double BrightTi5 { get; set; }
    public double Frp { get; set; }

    public DayNight DayNight { get; set; }

    public FireType Type { get; set; }
}

