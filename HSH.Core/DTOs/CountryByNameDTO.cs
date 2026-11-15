using System;
using System.ComponentModel.DataAnnotations;
using System.Data;

namespace HSH.Core.DTOs;

public class CountryByNameDTO
{
    
    public string CountryName {get;set;} = string.Empty;

    public string CountryCode { get; set; } = string.Empty;
}
