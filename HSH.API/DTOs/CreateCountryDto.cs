using System;
using System.ComponentModel.DataAnnotations;
using System.Data;

namespace HSH.API.DTOs;

public class CreateCountryDto
{
    [Required, MaxLength(100)]
    public string CountryName {get;set;}

    [Required, MaxLength(5)]
    [RegularExpression("^[A-Z]{2}$", ErrorMessage = "Country code must be ISO 3166-1 alpha-2 format")]
    public string CountryCode { get; set; }
}
