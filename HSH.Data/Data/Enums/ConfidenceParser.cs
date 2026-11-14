using System.Globalization;

namespace HSH.Data.Enums;

public static class ConfidenceParser
{
    // VIIRS uses l / n / h, MODIS uses 0-100.
    // MODIS ranges per FIRMS docs: 0-29 low, 30-79 nominal, 80-100 high.
    public static Confidence Parse(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);

        var trimmed = value.Trim();

        switch (trimmed.ToLowerInvariant())
        {
            case "l":
            case "low":
                return Confidence.Low;
            case "n":
            case "nominal":
                return Confidence.Nominal;
            case "h":
            case "high":
                return Confidence.High;
        }

        if (int.TryParse(trimmed, NumberStyles.Integer, CultureInfo.InvariantCulture, out var percent))
        {
            return FromPercent(percent);
        }

        throw new FormatException($"Unrecognized confidence value '{value}'.");
    }

    public static Confidence FromPercent(int percent)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(percent, 0);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(percent, 100);

        return percent switch
        {
            < 30 => Confidence.Low,
            < 80 => Confidence.Nominal,
            _ => Confidence.High
        };
    }
}
