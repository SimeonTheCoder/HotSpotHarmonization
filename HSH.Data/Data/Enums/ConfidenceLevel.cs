namespace HSH.Data.Enums
{
    /// <summary>VIIRS "confidence" column (l/n/h), stored as tinyint.</summary>
    public enum ConfidenceLevel : byte
    {
        Low = 1,     // "l"
        Nominal = 2, // "n"
        High = 3,    // "h"
    }
}
