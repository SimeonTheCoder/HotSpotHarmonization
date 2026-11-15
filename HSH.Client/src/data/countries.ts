import countryData from "world-countries";

export interface CountryOption {
    value: string;
    label: string;
    code: string;
    coordinates: [number, number];
}

const countries: CountryOption[] = countryData
    .filter((country) => country.latlng.length === 2)
    .map((country) => ({
        value: country.cca2,
        label: country.name.common,
        code: country.cca3,
        coordinates: country.latlng as [number, number],
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
// A short list of countries for now. Later the list will come from the backend.
export interface Country {
    code: string; // ISO 3-letter code, the same as the backend will use
    name: string;
}

const countriesList: Country[] = [
    { code: "AGO", name: "Angola" },
    { code: "ARG", name: "Argentina" },
    { code: "AUS", name: "Australia" },
    { code: "BOL", name: "Bolivia" },
    { code: "BRA", name: "Brazil" },
    { code: "BGR", name: "Bulgaria" },
    { code: "KHM", name: "Cambodia" },
    { code: "CAN", name: "Canada" },
    { code: "CHL", name: "Chile" },
    { code: "CHN", name: "China" },
    { code: "COL", name: "Colombia" },
    { code: "COD", name: "DR Congo" },
    { code: "ETH", name: "Ethiopia" },
    { code: "FRA", name: "France" },
    { code: "DEU", name: "Germany" },
    { code: "GRC", name: "Greece" },
    { code: "IND", name: "India" },
    { code: "IDN", name: "Indonesia" },
    { code: "ITA", name: "Italy" },
    { code: "KAZ", name: "Kazakhstan" },
    { code: "LAO", name: "Laos" },
    { code: "MDG", name: "Madagascar" },
    { code: "MEX", name: "Mexico" },
    { code: "MNG", name: "Mongolia" },
    { code: "MOZ", name: "Mozambique" },
    { code: "MMR", name: "Myanmar" },
    { code: "NGA", name: "Nigeria" },
    { code: "PRY", name: "Paraguay" },
    { code: "PER", name: "Peru" },
    { code: "PRT", name: "Portugal" },
    { code: "ROU", name: "Romania" },
    { code: "RUS", name: "Russia" },
    { code: "ZAF", name: "South Africa" },
    { code: "ESP", name: "Spain" },
    { code: "TZA", name: "Tanzania" },
    { code: "THA", name: "Thailand" },
    { code: "TUR", name: "Turkey" },
    { code: "UKR", name: "Ukraine" },
    { code: "GBR", name: "United Kingdom" },
    { code: "USA", name: "United States" },
    { code: "VEN", name: "Venezuela" },
    { code: "VNM", name: "Vietnam" },
    { code: "ZMB", name: "Zambia" },
];

export default countries;
