export interface FireDetection {
    id: string;
    latitude: number;
    longitude: number;
}

/* ---------- Search by country and dates ---------- */

// same address logic as api.ts: VITE_API_URL, else "dotnet run" during "npm run dev", else the page's own server
const API_URL: string =
    import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:65238" : window.location.origin);

interface FireQuery {
    start: string;       // "YYYY-MM-DD"
    end: string;         // "YYYY-MM-DD", at most 31 days after start
    countryCode: string; // 2-letter ISO code, for example "BG" (countries.ts "value")
}

// GET /api/map/{countryCode}?start=..&end=.. returns [{ latitude, longitude }] of every fire in that period
export async function getFireDetections(
    query: FireQuery,
    signal?: AbortSignal,
): Promise<FireDetection[]> {
    const url = new URL(`/api/map/${encodeURIComponent(query.countryCode)}`, API_URL);
    url.searchParams.set("start", query.start);
    url.searchParams.set("end", query.end);

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    const rows = (await res.json()) as { latitude: number; longitude: number }[];

    // the API sends no id, so the fires are numbered (the map needs a unique key per fire)
    return rows.map((r, i) => ({
        id: `country-${i}`,
        latitude: r.latitude,
        longitude: r.longitude,
    }));
}

/* ---------- Search by map view (all dates) ---------- */

export interface AreaQuery {
    north: number;
    south: number;
    west: number;
    east: number;
}

// Searches ALL dates: it ignores the country and the date range filters
export async function getFiresInArea(
    query: AreaQuery,
    signal?: AbortSignal,
): Promise<FireDetection[]> {
    // REAL VERSION (when the endpoint exists):
    // const params = new URLSearchParams({
    //     north: query.north.toFixed(5),
    //     south: query.south.toFixed(5),
    //     west: query.west.toFixed(5),
    //     east: query.east.toFixed(5),
    // });
    // const res = await fetch(`/api/detections/area?${params}`, { signal });
    // if (!res.ok) throw new Error(`API error ${res.status}`);
    // return res.json(); // must contain a unique id per fire

    // MOCK: random fires inside the requested box
    console.log("Requesting fires in area", query);
    await new Promise((resolve) => setTimeout(resolve, 400));
    signal?.throwIfAborted();

    return Array.from({ length: 30 }, () => {
        const latitude =
            query.south + Math.random() * (query.north - query.south);
        const longitude =
            query.west + Math.random() * (query.east - query.west);
        return {
            id: `${latitude.toFixed(5)},${longitude.toFixed(5)}`,
            latitude,
            longitude,
        };
    });
}