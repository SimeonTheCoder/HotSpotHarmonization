// FAKE DATA. These numbers are made up, they are not real fire detections.
// The function has the same shape as the backend endpoint we asked for:
//   GET /api/countries/{code}/monthly?from=2001&to=2025&types=vegetation,gas
// (the "types" part is our proposal: the backend adds up only the chosen types)
// When the API exists, only the inside of this function changes.

import type { FireType } from "./fireTypes";

export interface MonthlyRow {
    year: number;
    month: number; // 1 to 12
    hotspots: number;
}

// turns a text into a number, so the same country always gives the same fake data
function hash(text: string): number {
    let h = 0;
    for (const ch of text) {
        h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    }
    return h;
}

// a tiny random number generator that gives the same numbers for the same seed
function seeded(seed: number) {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

export async function getCountryMonthly(
    code: string,
    from: number,
    to: number,
    types: FireType[],
): Promise<MonthlyRow[]> {
    const rand = seeded(hash(code));
    const size = 3000 + rand() * 60000; // how much this country burns
    const peakMonth = 1 + Math.floor(rand() * 12);

    // how big each type is compared with the vegetation fires
    // (volcanoes and gas platforms only exist in some countries)
    const typeSize: Record<FireType, number> = {
        vegetation: 1,
        human: 0.04 + rand() * 0.08,
        volcano: hash(code) % 7 === 0 ? 0.03 : 0,
        gas: hash(code) % 4 === 0 ? 0.02 : 0,
    };

    const rows: MonthlyRow[] = [];
    for (let year = from; year <= to; year++) {
        const yearRand = seeded(hash(code + year));
        const yearFactor = 0.6 + yearRand() * 0.9; // some years burn more
        const trend = 1 + (year - 2001) * 0.01;

        for (let month = 1; month <= 12; month++) {
            // fires follow a yearly rhythm with one peak month
            const season = 1 + 0.9 * Math.cos((2 * Math.PI * (month - peakMonth)) / 12);
            const noise = 0.85 + yearRand() * 0.3;

            let hotspots = 0;
            for (const type of types) {
                // only vegetation fires follow the seasons, the other types stay about the same
                const rhythm = type === "vegetation" ? season * yearFactor : 1;
                hotspots += (size / 12) * typeSize[type] * rhythm * trend * noise;
            }
            rows.push({ year, month, hotspots: Math.round(hotspots) });
        }
    }
    return rows;
}
