// The types of hotspot that NASA FIRMS tells apart (its "type" column).
export type FireType = "vegetation" | "volcano" | "human" | "gas";

export const fireTypes: { value: FireType; label: string; firmsType: number }[] = [
    { value: "vegetation", label: "Vegetation fire", firmsType: 0 },
    { value: "volcano", label: "Active volcano", firmsType: 1 },
    { value: "human", label: "Human-made fires", firmsType: 2 }, // "other static land source"
    { value: "gas", label: "Gas platforms", firmsType: 3 }, // "offshore"
];
