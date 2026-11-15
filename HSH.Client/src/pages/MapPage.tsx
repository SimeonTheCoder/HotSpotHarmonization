import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FireMap, { type FireSpot } from "../components/Map";
import CountryDropdown from "../components/CountryFilter";
import type { CountryOption } from "../data/countries";
import { getCountryFeature } from "../data/countryShapes";

const DEFAULT_CENTER: [number, number] = [42.7, 25.3];

function MapPage() {
    const [selectedCountry, setSelectedCountry] =
        useState<CountryOption | null>(null);
    const [highlighted, setHighlighted] = useState(false);
    const [selectionId, setSelectionId] = useState(0);

    // /map?lat=..&lon=.. shows one fire with the fire icon (the link comes from the statistics page)
    const [params] = useSearchParams();
    const fire = useMemo<FireSpot | null>(() => {
        const lat = Number(params.get("lat"));
        const lon = Number(params.get("lon"));
        if (!params.has("lat") || !params.has("lon") || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        const temp = params.get("temp");
        return {
            lat,
            lon,
            date: params.get("date") ?? undefined,
            brightness: temp ? Number(temp) : undefined,
        };
    }, [params]);

    const center = selectedCountry?.coordinates ?? (fire ? [fire.lat, fire.lon] as [number, number] : DEFAULT_CENTER);

    // Computed in the same render as `center`, so the map gets both together
    const feature = useMemo(
        () => getCountryFeature(selectedCountry?.code),
        [selectedCountry],
    );

    const handleChange = (country: CountryOption | null) => {
        setSelectedCountry(country);
        setSelectionId((n) => n + 1); // re-triggers the move even for the same country
        setHighlighted(true);
    };

    return (
        <div className="map-page">
            <h2 className="map-title">Fire map</h2>

            <div className="map-toolbar">
                <label>Country</label>
                <CountryDropdown onChange={handleChange} />
            </div>

            <div className="map-wrapper">
                <FireMap
                    center={center}
                    fire={fire}
                    feature={feature}
                    highlighted={highlighted}
                    selectionId={selectionId}
                    onClear={() => setHighlighted(false)}
                />
            </div>
        </div>
    );
}

export default MapPage;
