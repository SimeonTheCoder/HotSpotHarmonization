using System;

namespace HSH.Core.DTOs
{
    public class FireDataResponseDto
    {
        public long Id { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public float? Brightness { get; set; }
        public DateTime AcquiredAt { get; set; }
        public string CountryName { get; set; } = string.Empty;
        public string Satellite { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
    }
}