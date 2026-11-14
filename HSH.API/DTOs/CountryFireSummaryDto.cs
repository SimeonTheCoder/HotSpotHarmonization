namespace HSH.API.DTOs
{
    public class CountryFireSummaryDto
    {
        public int CountryId { get; set; }
        public string CountryName { get; set; }
        public int TotalFires { get; set; }
        public double AverageTemperatureK { get; set; }
        public float MaxTemperatureK { get; set; }
    }
}