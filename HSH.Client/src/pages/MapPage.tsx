import { useState } from "react";
import FireMap from "../components/Map";
import CountryDropdown from "../components/CountryFilter";
import type { CountryOption } from "../data/countries";
import FilterDropdown from "../components/FilterField";

const DEFAULT_CENTER: [number, number] = [42.7, 25.3];
function MapPage() {
    const [selectedCountry, setSelectedCountry] =
        useState<CountryOption | null>(null);
    const [selectedSensor, setSelectedSensor] = useState("All");

    const center = selectedCountry?.coordinates ?? DEFAULT_CENTER;

    return (
        <div className="map-page">
            <h2 className="map-title">Fire map</h2>

            <div className="map-toolbar">
                <label>Country</label>
                <CountryDropdown onChange={setSelectedCountry} />
            </div>

            <div className="map-wrapper">
                <FireMap center={center} />
            </div>
        </div>
    );
}

export default MapPage;
