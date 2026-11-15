using HSH.Data.Enums;

namespace HSH.Core.Services;

/// <summary>Parses the client's fire type names ("vegetation,volcano,human,gas") into FireType values.</summary>
public static class FireTypeNames
{
    private static readonly Dictionary<string, FireType> ByName = new(StringComparer.OrdinalIgnoreCase)
    {
        ["vegetation"] = FireType.PresumedVegetationFire,
        ["volcano"] = FireType.ActiveVolcano,
        ["human"] = FireType.OtherStaticLandSource,
        ["gas"] = FireType.Offshore,
    };

    /// <summary>Empty or missing = all types. Accepts the client names, enum names or the numbers 0-3.</summary>
    public static bool TryParse(string? value, out IReadOnlyCollection<FireType> types, out string? invalid)
    {
        invalid = null;
        if (string.IsNullOrWhiteSpace(value))
        {
            types = Enum.GetValues<FireType>();
            return true;
        }

        var result = new HashSet<FireType>();
        foreach (var part in value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (ByName.TryGetValue(part, out var t)
                || (Enum.TryParse(part, ignoreCase: true, out t) && Enum.IsDefined(t)))
            {
                result.Add(t);
            }
            else
            {
                invalid = part;
                types = [];
                return false;
            }
        }
        types = result;
        return true;
    }
}
