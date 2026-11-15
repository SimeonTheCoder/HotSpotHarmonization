namespace HSH.Data.Enums
{
    /// <summary>FIRMS "type" column (inferred hot spot type), stored as tinyint.</summary>
    public enum FireType : byte
    {
        PresumedVegetationFire = 0, // 0
        ActiveVolcano = 1,          // 1
        OtherStaticLandSource = 2,  // 2
        Offshore = 3,               // 3
    }
}
