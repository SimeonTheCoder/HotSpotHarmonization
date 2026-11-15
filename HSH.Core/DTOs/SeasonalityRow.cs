namespace HSH.Core.DTOs;

/// <summary>Number of hotspots of one country in one calendar month, added up over a range of years ("Fires by month" chart).</summary>
/// <param name="Month">1 = January ... 12 = December.</param>
/// <param name="Hotspots">Number of fire detections in that month of all the years in the range.</param>
public record SeasonalityRow(int Month, int Hotspots);
