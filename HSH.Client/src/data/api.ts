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
