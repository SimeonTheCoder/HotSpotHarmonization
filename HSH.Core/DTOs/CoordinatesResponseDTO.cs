using System.Text.Json.Serialization;

namespace HSH.Core.DTOs;

public class CoordinatesResponseDTO
{
    [JsonPropertyName("latitude")]
    public float Latitude { get; set; }

    [JsonPropertyName("longitude")]
    public float Longitude { get; set; }
}
