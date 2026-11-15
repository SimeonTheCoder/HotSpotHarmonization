export interface FireDetection {
    id: string;
    latitude: number;
    longitude: number;
}

/* ---------- Search by country and dates ---------- */

interface FireQuery {
    start: string;        // "YYYY-MM-DD"
    end: string;          // "YYYY-MM-DD"
    countryCode?: string; // 3-letter code
}

export async function getFireDetections(
    query: FireQuery,
    signal?: AbortSignal,
): Promise<FireDetection[]> {
    // REAL VERSION (when the endpoint exists):
    // const params = new URLSearchParams({ start: query.start, end: query.end });
    // if (query.countryCode) params.set("country", query.countryCode);
    // const res = await fetch(`/api/detections?${params}`, { signal });
    // if (!res.ok) throw new Error(`API error ${res.status}`);
    // return res.json();

    // MOCK
    console.log("Requesting detections", query);
    await new Promise((resolve) => setTimeout(resolve, 400));
    signal?.throwIfAborted();

    return Array.from({ length: 200 }, (_, i) => ({
        id: String(i),
        latitude: -60 + Math.random() * 130,
        longitude: -180 + Math.random() * 360,
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