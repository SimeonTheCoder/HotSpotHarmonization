// Calls to the HSH.API backend.
// The address can be set with VITE_API_URL (for example in a .env.local file).
// Without it: during "npm run dev" the API from "dotnet run" is used,
// after "npm run build" the page asks the server it was loaded from.

import type { FireType } from "./fireTypes";
import type { MonthlyRow } from "./mockData";

export const API_URL: string =
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

// One fire detection as the "Detailed stats" list shows it (the FIRMS columns of the database).
export interface Fire {
    id: string; // database Id
    latitude: number;
    longitude: number;
    acq_date: string; // "2025-07-14"
    acq_time: number; // UTC as HHMM, for example 1558 means 15:58
    satellite: string; // "Terra", "Aqua", "N", "N20", "N21"
    instrument: "MODIS" | "VIIRS";
    temperature: number | null; // Kelvin: MODIS "brightness" or VIIRS "bright_ti4" (the list is sorted by it)
    brightness: number | null; // MODIS only (channel 21/22)
    bright_t31: number | null; // MODIS only (channel 31)
    bright_ti4: number | null; // VIIRS only (I-4 channel)
    bright_ti5: number | null; // VIIRS only (I-5 channel)
    scan: number; // pixel width in km
    track: number; // pixel height in km
    frp: number; // fire radiative power in megawatts
    confidence: string; // MODIS: "75%", VIIRS: "low" / "nominal" / "high"
    version: string;
    daynight: "D" | "N";
    type: number; // 0 vegetation fire, 1 active volcano, 2 other static land source, 3 offshore
}

interface TopFireDto {
    id: number;
    latitude: number;
    longitude: number;
    acquiredAt: string; // "2025-07-14T15:58:00"
    satellite: string;
    instrument: "MODIS" | "VIIRS";
    temperature: number | null;
    brightness: number | null;
    brightT31: number | null;
    brightTi4: number | null;
    brightTi5: number | null;
    scan: number;
    track: number;
    frp: number;
    confidencePercent: number | null;
    confidenceLevel: string | null;
    version: number;
    dayNight: "D" | "N";
    type: number;
}

const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

// the hottest fires of one month (month = null: the whole year), hottest first
export async function getTopFires(
    countryCode: string,
    year: number,
    month: number | null,
    types: FireType[],
    instrument: "modis" | "viirs" | null = null,
    limit = 25,
): Promise<Fire[]> {
    const params: Record<string, string | number> = { year, types: types.join(","), limit };
    if (month !== null) params.month = month;
    if (instrument !== null) params.instrument = instrument;

    const rows = await get<TopFireDto[]>(`/api/statistics/${encodeURIComponent(countryCode)}/top-fires`, params);
    return rows.map((r) => ({
        id: String(r.id),
        latitude: r.latitude,
        longitude: r.longitude,
        acq_date: r.acquiredAt.slice(0, 10),
        acq_time: Number(r.acquiredAt.slice(11, 13) + r.acquiredAt.slice(14, 16)),
        satellite: r.satellite,
        instrument: r.instrument,
        temperature: round1(r.temperature),
        brightness: round1(r.brightness),
        bright_t31: round1(r.brightT31),
        bright_ti4: round1(r.brightTi4),
        bright_ti5: round1(r.brightTi5),
        scan: round1(r.scan) ?? 0,
        track: round1(r.track) ?? 0,
        frp: round1(r.frp) ?? 0,
        confidence:
            r.confidencePercent !== null ? `${r.confidencePercent}%` : (r.confidenceLevel ?? "n/a"),
        version: String(Math.round(r.version * 100) / 100),
        daynight: r.dayNight,
        type: r.type,
    }));
}
