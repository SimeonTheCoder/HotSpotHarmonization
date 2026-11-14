import countryData from "world-countries";


export interface CountryOption {
    value: string;
    label: string;
    coordinates: [number, number];
}

const countries: CountryOption[] = countryData
    .filter((country) => country.latlng.length === 2)
    .map((country) => ({
        value: country.cca2,
        label: country.name.common,
        coordinates: country.latlng as [number, number]
    }))
    .sort((a, b) => a.label.localeCompare(b.label));


export default countries;