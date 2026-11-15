namespace HSH.Core.DTOs;

/// <summary>Number of hotspots of one country in one month, split by instrument ("MODIS vs VIIRS" chart).</summary>
/// <param name="Year">Calendar year, e.g. 2025.</param>
/// <param name="Month">1 = January ... 12 = December.</param>
/// <param name="Modis">Detections made by MODIS (Terra / Aqua).</param>
/// <param name="Viirs">Detections made by VIIRS (S-NPP / NOAA-20 / NOAA-21).</param>
public record InstrumentMonthlyRow(int Year, int Month, int Modis, int Viirs);
