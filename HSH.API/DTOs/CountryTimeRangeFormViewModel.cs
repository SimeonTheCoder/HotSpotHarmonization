using System.Text.Json.Serialization;

namespace HSH.Core.DTOs;

class CountryTimeRangeFormViewModel
{
    [JsonPropertyName("startDate")]
    public DateTime StartDate { get; set; }

    [JsonPropertyName("endDate")]
    public DateTime EndDate { get; set; }

    [JsonPropertyName("countryCode")]
    public string CountryCode { get; set; } = string.Empty;
}
