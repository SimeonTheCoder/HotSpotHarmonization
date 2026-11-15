using System;

namespace HSH.API.Models.Requests;

public class GetFiresByCountryNameRequest
{
    public string CountryName { get; set; } = string.Empty;
}
