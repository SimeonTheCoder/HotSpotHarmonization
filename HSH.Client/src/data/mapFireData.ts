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
    countryCode: string; // 2-letter ISO code of the country under the centre of the view (the API searches one country's tree)
}

// GET /api/map/{countryCode}/rect?x1=..&y1=..&x2=..&y2=.. returns [{ latitude, longitude }] of all dates.
// (x1, y1) and (x2, y2) are two opposite corners; x is the LONGITUDE and y the LATITUDE,
// because the country's tree splits on longitude first (see HSH.Importer).
export async function getFiresInArea(
    query: AreaQuery,
    signal?: AbortSignal,
): Promise<FireDetection[]> {
    const url = new URL(`/api/map/${encodeURIComponent(query.countryCode)}/rect`, API_URL);
    url.searchParams.set("x1", query.west.toFixed(5)); // bottom-left corner
    url.searchParams.set("y1", query.south.toFixed(5));
    url.searchParams.set("x2", query.east.toFixed(5)); // top-right corner
    url.searchParams.set("y2", query.north.toFixed(5));

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    const rows = (await res.json()) as { latitude: number; longitude: number }[];

    return (
        rows
            // the API returns every fire of the tree cells that touch the box (cells can be much bigger
            // than the view), so only the fires really inside the visible area are kept
            .filter(
                (r) =>
                    r.latitude >= query.south &&
                    r.latitude <= query.north &&
                    r.longitude >= query.west &&
                    r.longitude <= query.east,
            )
            // the id is the position, so a fire found again by a later search is shown once
            .map((r) => ({
                id: `${r.latitude.toFixed(5)},${r.longitude.toFixed(5)}`,
                latitude: r.latitude,
                longitude: r.longitude,
            }))
    );
}