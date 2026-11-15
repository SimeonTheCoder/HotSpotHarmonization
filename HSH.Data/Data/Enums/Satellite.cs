namespace HSH.Data.Enums
{
    /// <summary>FIRMS "satellite" column, stored as tinyint.</summary>
    public enum Satellite : byte
    {
        Terra = 1,    // "Terra"
        Aqua = 2,     // "Aqua"
        SuomiNpp = 3, // "N"   (VIIRS S-NPP)
        Noaa20 = 4,   // "N20" (VIIRS NOAA-20 / JPSS-1)
        Noaa21 = 5,   // "N21" (VIIRS NOAA-21 / JPSS-2, not in current data)
    }
}
