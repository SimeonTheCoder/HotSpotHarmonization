namespace HSH.Core.DTOs;

/// <summary>Number of hotspots of one country in one month (same shape as the client's MonthlyRow).</summary>
/// <param name="Year">Calendar year, e.g. 2025.</param>
/// <param name="Month">1 = January ... 12 = December.</param>
/// <param name="Hotspots">Number of fire detections.</param>
public record MonthlyRow(int Year, int Month, int Hotspots);
