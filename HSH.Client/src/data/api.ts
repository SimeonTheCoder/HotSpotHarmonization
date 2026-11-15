// Calls to the HSH.API backend.
// The address can be set with VITE_API_URL (for example in a .env.local file).
// Without it: during "npm run dev" the API from "dotnet run" is used,
// after "npm run build" the page asks the server it was loaded from.

import type { FireType } from "./fireTypes";
import type { MonthlyRow } from "./mockData";

const API_URL: string =
    import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:65238" : window.location.origin);

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
    const url = new URL(path, API_URL);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error ${response.status}: ${await response.text()}`);
    return (await response.json()) as T;
}
export async function getAllFiresByCountry(countryName: string): Promise<FireDataResponseDto[]> {
    const response = await fetch(`/api/firedata/country-name/${encodeURIComponent(countryName)}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch fires for country: ${countryName}`);
    }
    return response.json();
}

// Add this interface to src/data/api.ts
export interface FireDataResponseDto {
    id: number;
    latitude: number;
    longitude: number;
    brightness: number | null;
    acquiredAt: string; // Serialized from C# DateTime
    countryName: string;
    satellite: string;
    type: string;
}

// GET: /api/firedata/country-name/{countryName}
export function getFiresByCountryName(countryName: string): Promise<FireDataResponseDto[]> {
    return get<FireDataResponseDto[]>(`/api/firedata/country-name/${encodeURIComponent(countryName)}`, {});
}

// GET: /api/firedata/country-code/{countryCode}/hottest-fires
export function getHottestFires(
    countryCode: string,
    startDate: string,
    endDate: string,
    fireType?: number
): Promise<FireDataResponseDto[]> {
    const params: Record<string, string | number> = {
        startDate,
        endDate,
    };
    if (fireType !== undefined) {
        params.fireType = fireType;
    }
    return get<FireDataResponseDto[]>(`/api/firedata/country-code/${encodeURIComponent(countryCode)}/hottest-fires`, params);
}


// countryCode is the two-letter ISO code, for example "BG" (countries.ts "value")

// hotspots per month of one year: 12 rows
export function getMonthly(countryCode: string, year: number, types: FireType[]): Promise<MonthlyRow[]> {
    return get<MonthlyRow[]>(`/api/statistics/${encodeURIComponent(countryCode)}/monthly`, {
        year,
        types: types.join(","),
    });
}

// hotspots per month of two years: 24 rows, first yearA then yearB
export function compareYears(
    countryCode: string,
    yearA: number,
    yearB: number,
    types: FireType[],
): Promise<MonthlyRow[]> {
    return get<MonthlyRow[]>(`/api/statistics/${encodeURIComponent(countryCode)}/compare`, {
        yearA,
        yearB,
        types: types.join(","),
    });
}

export interface InstrumentRow {
    year: number;
    month: number; // 1 to 12
    modis: number;
    viirs: number;
}

// hotspots per month of one year, split into MODIS and VIIRS: 12 rows
export function getInstruments(countryCode: string, year: number, types: FireType[]): Promise<InstrumentRow[]> {
    return get<InstrumentRow[]>(`/api/statistics/${encodeURIComponent(countryCode)}/instruments`, {
        year,
        types: types.join(","),
    });
}

export interface Fire {
    id: string;
    brightness: number;
}

// Bridges your old Statistics component call to your new backend data
export async function getTopFires(
    countryCode: string,
    year: number,
    month: number | null,
    types: string[],
    instrument: string | null
): Promise<Fire[]> {
    // Map your 2-letter country code to the full country name required by your new endpoint
    const countryMap: Record<string, string> = {
        BG: "Bulgaria",
        // Add other country mappings if needed
    };
    const countryName = countryMap[countryCode] || "Bulgaria";

    try {
        const fires = await getFiresByCountryName(countryName);

        return fires
            .filter(f => {
                const date = new Date(f.acquiredAt);
                const matchesYear = date.getFullYear() === year;
                const matchesMonth = month === null || (date.getMonth() + 1) === month;
                const matchesInstrument = !instrument || f.satellite.toLowerCase() === instrument.toLowerCase();
                return matchesYear && matchesMonth && matchesInstrument;
            })
            .sort((a, b) => (b.brightness ?? 0) - (a.brightness ?? 0))
            .slice(0, 10) // Top 10 hottest fires for the clicked bar
            .map(f => ({
                id: String(f.id),
                brightness: f.brightness ?? 0
            }));
    } catch (error) {
        console.error("Failed to fetch top fires:", error);
        return [];
    }
}