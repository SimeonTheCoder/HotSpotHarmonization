using System;
using System.ComponentModel.DataAnnotations;
using System.Data;
using HSH.Data.Models;

namespace HSH.API.DTOs;

public class CreateFireDataDto
{
    [Required]
    public int TreeID {get;set;}

    [Required]
    public int CountryId {get; set;}

    [Required]
    [Range(-90,90)]
    public double Latitude {get;set;}

    [Required]
    [Range(-180,180)]
    public double Longitude {get;set;}
    
    [Required]
    public SatelliteSource Sat {get;set;}

    [Required]
    [Range(typeof(decimal), "0.1", "100")]
    public decimal PixelSize {get;set;}

    [Required]
    public float TemperatureK {get;set;}

    [Required]
    public int Type {get;set;}

    [Required]
    public DateTime Date { get; set;}
    public string CountryName { get; internal set; }
}
