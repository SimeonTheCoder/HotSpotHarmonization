import type { Feature, FeatureCollection, Position } from "geojson";
import worldData from "./countries.geo.json";

const world = worldData as unknown as FeatureCollection;

/* ---------- Which country is at a point (worked out in the browser, no outside service) ---------- */

// true when the point is inside the ring (ray casting); a ring is a list of [lon, lat]
function inRing(lon: number, lat: number, ring: Position[]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

// a polygon is an outer ring followed by holes (lakes, enclaves)
function inPolygon(lon: number, lat: number, rings: Position[][]): boolean {
    if (rings.length === 0 || !inRing(lon, lat, rings[0])) return false;
    return !rings.slice(1).some((hole) => inRing(lon, lat, hole));
}

function polygonsOf(feature: Feature): Position[][][] {
    const g = feature.geometry;
    if (g?.type === "Polygon") return [g.coordinates];
    if (g?.type === "MultiPolygon") return g.coordinates;
    return [];
}

interface CountryBox {
    feature: Feature;
    west: number;
    south: number;
    east: number;
    north: number;
}

// the bounding box of every country, worked out once, so most countries are skipped without the slow check
let boxes: CountryBox[] | null = null;

function getBoxes(): CountryBox[] {
    if (boxes) return boxes;
    boxes = world.features.map((feature) => {
        const box = { feature, west: 180, south: 90, east: -180, north: -90 };
        for (const polygon of polygonsOf(feature)) {
            for (const [lon, lat] of polygon[0] ?? []) {
                box.west = Math.min(box.west, lon);
                box.east = Math.max(box.east, lon);
                box.south = Math.min(box.south, lat);
                box.north = Math.max(box.north, lat);
            }
        }
        return box;
    });
    return boxes;
}

// the country at a point, with its 2-letter code ("BG") and name, or null (sea, or no code)
export function getCountryAt(lat: number, lon: number): { code: string; name: string } | null {
    const x = ((((lon + 180) % 360) + 360) % 360) - 180; // the map can be scrolled past 180°
    for (const b of getBoxes()) {
        if (x < b.west || x > b.east || lat < b.south || lat > b.north) continue;
        if (!polygonsOf(b.feature).some((p) => inPolygon(x, lat, p))) continue;

        const code = String(b.feature.properties?.["ISO3166-1-Alpha-2"] ?? "");
        if (!/^[A-Z]{2}$/.test(code)) return null; // some territories have "-99" instead of a code
        return { code, name: String(b.feature.properties?.name ?? code) };
    }
    return null;
}

export function getCountryFeature(code?: string): Feature | null {
    if (!code) return null;
    return (
        world.features.find(
            (f) => f.properties?.["ISO3166-1-Alpha-3"] === code
        ) ?? null
    );
}