import type { Feature, FeatureCollection } from "geojson";
import worldData from "./countries.geo.json";

const world = worldData as unknown as FeatureCollection;

export function getCountryFeature(code?: string): Feature | null {
    if (!code) return null;
    return (
        world.features.find(
            (f) => f.properties?.["ISO3166-1-Alpha-3"] === code
        ) ?? null
    );
}