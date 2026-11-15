// The world fire-density heatmap: a transparent PNG made by the API (HeatmapController).
// The API builds it once in the background (the first time can take minutes), so this asks again
// every few seconds until the picture is ready.

import { API_URL } from "./api";

// the picture covers the whole Web Mercator world, the same projection as the Leaflet map
export const HEATMAP_BOUNDS: [[number, number], [number, number]] = [
    [-85.05112878, -180],
    [85.05112878, 180],
];

const POLL_MS = 5000;

interface HeatmapStatus {
    state: "idle" | "generating" | "ready" | "failed";
    error: string | null;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal.addEventListener(
            "abort",
            () => {
                clearTimeout(timer);
                reject(signal.reason);
            },
            { once: true },
        );
    });
}

// returns an object URL of the PNG; onWaiting is called while the server is still building it
export async function loadHeatmap(signal: AbortSignal, onWaiting?: () => void): Promise<string> {
    const imageUrl = new URL("/api/heatmap", API_URL);
    const statusUrl = new URL("/api/heatmap/status", API_URL);

    // the first request starts the build if the picture does not exist yet
    let res = await fetch(imageUrl, { signal });

    while (res.status === 202) {
        onWaiting?.();
        await wait(POLL_MS, signal);

        const status = (await (await fetch(statusUrl, { signal })).json()) as HeatmapStatus;
        if (status.state === "failed") throw new Error(status.error ?? "The heatmap could not be made.");
        // "idle" happens when the API was restarted meanwhile: asking for the picture starts it again
        if (status.state === "ready" || status.state === "idle") res = await fetch(imageUrl, { signal });
    }

    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    return URL.createObjectURL(await res.blob());
}
