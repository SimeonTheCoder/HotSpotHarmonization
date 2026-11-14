import { useMemo, useState } from "react";
import FireMap from "../components/Map";
import CountryDropdown from "../components/CountryFilter";
import type { CountryOption } from "../data/countries";
import { getCountryFeature } from "../data/countryShapes";

const DEFAULT_CENTER: [number, number] = [42.7, 25.3];

function MapPage() {
    const [selectedCountry, setSelectedCountry] =
        useState<CountryOption | null>(null);
    const [highlighted, setHighlighted] = useState(false);
    const [selectionId, setSelectionId] = useState(0);

    const center = selectedCountry?.coordinates ?? DEFAULT_CENTER;

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
