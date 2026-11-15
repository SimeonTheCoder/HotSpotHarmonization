export interface FireDetection {
    id: string;
    latitude: number;
    longitude: number;
}

interface FireQuery {
    start: string;        // "YYYY-MM-DD"
    end: string;          // "YYYY-MM-DD"
    countryCode?: string; // 3-letter code, undefined = whole map
}

export async function getFireDetections(
    query: FireQuery,
    signal?: AbortSignal
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