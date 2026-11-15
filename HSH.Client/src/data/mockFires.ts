// FAKE DATA. These fires are made up, they are not real detections.
// Same idea as mockData.ts. The function has the shape of an endpoint we can ask the backend for:
//   GET /api/countries/{code}/fires?year=2025&month=4&limit=25&types=vegetation
//   (month is left out for a whole year; the backend sorts by brightness, hottest first)
// When the API exists, only the inside of this function changes.
//
// A Fire has exactly the columns of the database (NASA FIRMS MODIS), for example:
//   latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight,type
//   18.1706,-77.1873,320.4,1,1,2000-11-07,1558,Terra,MODIS,75,6.2,296.8,14,D,0
// so the page shows nothing that the database cannot give us.

import countries from "./countries";
import { fireTypes, type FireType } from "./fireTypes";
import { hash, seeded } from "./mockData";

export interface Fire {
    id: string; // only used by the page to tell the rows apart, not a database column
    latitude: number;
    longitude: number;
    brightness: number; // Kelvin, temperature of the pixel (channel 21/22)
    scan: number; // pixel width in km
    track: number; // pixel height in km
    acq_date: string; // "2000-11-07"
    acq_time: number; // UTC as HHMM, for example 1558 means 15:58
    satellite: "Terra" | "Aqua";
    instrument: "MODIS";
    confidence: number; // 0 to 100
    version: string; // collection and version, for example "6.2"
    bright_t31: number; // Kelvin, temperature of the pixel (channel 31)
    frp: number; // fire radiative power in megawatts
    daynight: "D" | "N";
    type: number; // 0 vegetation fire, 1 active volcano, 2 other static land source, 3 offshore
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function getTopFires(
    code: string,
    year: number,
    month: number | null,
    types: FireType[],
    limit = 25,
): Promise<Fire[]> {
    const rand = seeded(hash(`${code}|${year}|${month ?? "all"}|${types.join(",")}`));
    const [centerLat, centerLon] = countries.find((c) => c.code === code)?.coordinates ?? [0, 0];
    const chosen = fireTypes.filter((t) => types.includes(t.value));
    if (chosen.length === 0) return [];

    const fires: Fire[] = [];
    for (let i = 0; i < limit; i++) {
        const m = month ?? 1 + Math.floor(rand() * 12);
        const day = 1 + Math.floor(rand() * 28);
        const hour = Math.floor(rand() * 24);
        const minute = Math.floor(rand() * 60);
        const brightness = round1(310 + 190 * Math.pow(rand(), 3)); // few very hot fires, many cooler ones
        fires.push({
            id: `${code}-${year}-${m}-${i}`,
            latitude: Math.round(Math.max(-90, Math.min(90, centerLat + (rand() - 0.5) * 6)) * 10000) / 10000,
            longitude: Math.round(Math.max(-180, Math.min(180, centerLon + (rand() - 0.5) * 8)) * 10000) / 10000,
            brightness,
            scan: round1(1 + rand() * 3),
            track: round1(1 + rand() * 1.5),
            acq_date: `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
            acq_time: hour * 100 + minute,
            satellite: rand() < 0.5 ? "Terra" : "Aqua",
            instrument: "MODIS",
            confidence: 55 + Math.floor(rand() * 46),
            version: "6.2",
            bright_t31: round1(brightness - 20 - rand() * 40),
            frp: Math.round((brightness - 300) * (1 + rand() * 4)),
            daynight: hour >= 6 && hour < 18 ? "D" : "N",
            type: chosen[Math.floor(rand() * chosen.length)].firmsType,
        });
    }
    return fires.sort((a, b) => b.brightness - a.brightness);
}
