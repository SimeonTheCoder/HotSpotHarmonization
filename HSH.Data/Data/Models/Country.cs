using System.ComponentModel.DataAnnotations;

namespace HSH.Data.Models;

public class Country
{
    public int Id { get; set; }

    [MaxLength(100)]
    public required string Name { get; set; }

    [MaxLength(3)]
    public required string Code { get; set; }

    // Name of the source CSV file the points were imported from
    [MaxLength(260)]
    public string? SourceFile { get; set; }

    public QuadTree? QuadTree { get; set; }

    public ICollection<FirePoint> FirePoints { get; set; } = new List<FirePoint>();
}
