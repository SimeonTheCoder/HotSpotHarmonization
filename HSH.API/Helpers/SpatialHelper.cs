using System;

namespace HSH.API.Helpers
{
    public static class SpatialHelper
    {
        public static string CalculateQuadTreeCell(double lat, double lon)
        {
            // Round to 1 decimal place to group points into a grid cell
            double roundedLat = Math.Round(lat, 1);
            double roundedLon = Math.Round(lon, 1);
            
            return $"Cell_{roundedLat}_{roundedLon}";
        }
    }
}