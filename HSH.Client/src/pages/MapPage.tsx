import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FireMap, { type FireSpot } from "../components/Map";
import CountryDropdown from "../components/CountryFilter";
import DateRangeFilter from "../components/DateRangeFilter";
import type { CountryOption } from "../data/countries";
import { getCountryFeature } from "../data/countryShapes";
import { getFireDetections } from "../data/mapFireData";
import { addMonths, today } from "../utils/dates";

const DEFAULT_CENTER: [number, number] = [42.7, 25.3];

type Status = "idle" | "loading" | "loaded" | "error";

function MapPage() {
    const [selectedCountry, setSelectedCountry] =
        useState<CountryOption | null>(null);
    const [highlighted, setHighlighted] = useState(false);
    const [selectionId, setSelectionId] = useState(0);

    // default range: the last month
    const [range, setRange] = useState(() => {
        const end = today();
        return { start: addMonths(end, -1), end };
    });

    const [status, setStatus] = useState<Status>("idle");
    const abortRef = useRef<AbortController | null>(null);

    // /map?lat=..&lon=.. shows one fire with the fire icon (the link comes from the detailed stats)
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

    const center = selectedCountry?.coordinates ?? (fire ? ([fire.lat, fire.lon] as [number, number]) : DEFAULT_CENTER);

    const feature = useMemo(
        () => getCountryFeature(selectedCountry?.code),
        [selectedCountry]
    );

    const handleCountryChange = (country: CountryOption | null) => {
        setSelectedCountry(country);
        setSelectionId((n) => n + 1);
        setHighlighted(true);
        setStatus("idle");
    };

    const handleRangeChange = (start: string, end: string) => {
        setRange({ start, end });
        setStatus("idle");
    };

    const handleApply = () => {
        if (!selectedCountry) return; // a country is required

        abortRef.current?.abort(); // cancel the previous request if still running
        const controller = new AbortController();
        abortRef.current = controller;

        setStatus("loading");
        getFireDetections(
            {
                start: range.start,
                end: range.end,
                countryCode: selectedCountry.code,
            },
            controller.signal
        )
            .then(() => {
                // TODO: the loaded rows will be drawn on the map here
                setStatus("loaded");
            })
            .catch((e: Error) => {
                if (e.name !== "AbortError") setStatus("error");
            });
    };

    return (
        <div className="map-page">
            <h2 className="map-title">Fire map</h2>

            <div className="map-toolbar">
                <div className="map-field">
                    <label>Country</label>
                    <CountryDropdown onChange={handleCountryChange} />
                </div>

                <DateRangeFilter
                    start={range.start}
                    end={range.end}
                    onChange={handleRangeChange}
                />

                <button
                    className="map-apply"
                    onClick={handleApply}
                    disabled={!selectedCountry || status === "loading"}
                    title={!selectedCountry ? "Select a country first" : undefined}
                >
                    {status === "loading" ? "Loading..." : "Apply"}
                </button>
            </div>

            <p className="map-hint">
                {!selectedCountry
                    ? "Select a country to load fire detections."
                    : "Maximum range: 1 month, from 2001 onwards. Changing one date adjusts the other automatically."}
                {status === "loaded" && " Loaded!"}
                {status === "error" && " Could not load detections."}
            </p>

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