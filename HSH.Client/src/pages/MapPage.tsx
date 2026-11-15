import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FireMap, { type FireSpot, type MapView } from "../components/Map";
import CountryDropdown from "../components/CountryFilter";
import DateRangeFilter from "../components/DateRangeFilter";
import type { CountryOption } from "../data/countries";
import { getCountryFeature } from "../data/countryShapes";
import {
    getFireDetections,
    getFiresInArea,
    type FireDetection,
} from "../data/mapFireData";
import { addMonths, today } from "../utils/dates";

const DEFAULT_CENTER: [number, number] = [42.7, 25.3];
const MAX_AREA_KM = 10; // the view must be this tall (north to south) or less

type Status = "idle" | "loading" | "loaded" | "error";
type AreaStatus = "idle" | "loading" | "loaded" | "empty" | "error";

const formatKm = (km: number) =>
    km < 100 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString()} km`;

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

    // search by country and dates ("Apply")
    const [status, setStatus] = useState<Status>("idle");
    const abortRef = useRef<AbortController | null>(null);

    // search by map view ("Search this area"): all dates, ignores the filters above
    const [view, setView] = useState<MapView | null>(null);
    const [fires, setFires] = useState<FireDetection[]>([]);
    const [areaStatus, setAreaStatus] = useState<AreaStatus>("idle");
    const areaAbortRef = useRef<AbortController | null>(null);

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

    const areaReady = view !== null && view.heightKm <= MAX_AREA_KM;

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

    const handleSearchArea = () => {
        if (!view || view.heightKm > MAX_AREA_KM) return;

        areaAbortRef.current?.abort();
        const controller = new AbortController();
        areaAbortRef.current = controller;

        setAreaStatus("loading");
        getFiresInArea(
            {
                north: view.north,
                south: view.south,
                west: view.west,
                east: view.east,
            },
            controller.signal
        )
            .then((rows) => {
                // add to the fires already on the map; the same id is kept once
                setFires((prev) => {
                    const byId = new Map(prev.map((f) => [f.id, f] as const));
                    for (const r of rows) byId.set(r.id, r);
                    return [...byId.values()];
                });
                setAreaStatus(rows.length > 0 ? "loaded" : "empty");
            })
            .catch((e: Error) => {
                if (e.name !== "AbortError") setAreaStatus("error");
            });
    };

    const handleClearMap = () => {
        areaAbortRef.current?.abort();
        setFires([]);
        setAreaStatus("idle");
    };

    return (
        <div className="map-page">
            <h2 className="map-title">Fire map</h2>

            <div className="map-controls">
                <section className="map-panel">
                    <h3 className="map-panel-title">
                        Search by country and dates · 
                        <span className="map-badge"> Uses filters</span>
                    </h3>

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
                </section>

                <section className="map-panel map-panel-area">
                    <h3 className="map-panel-title">
                        Search by map view ·
                        <span className="map-badge map-badge-all"> All time · Ignores filters</span>
                    </h3>

                    <div className="map-toolbar">
                        <button
                            className="map-apply"
                            onClick={handleSearchArea}
                            disabled={!areaReady || areaStatus === "loading"}
                            title={
                                !areaReady
                                    ? `Zoom in until the view is ${MAX_AREA_KM} km tall or less`
                                    : undefined
                            }
                        >
                            {areaStatus === "loading" ? "Searching..." : "Search this area"}
                        </button>

                        <button
                            className="map-apply map-clear"
                            onClick={handleClearMap}
                            disabled={fires.length === 0}
                        >
                            Clear map
                        </button>
                    </div>

                    <p className="map-hint">
                        Finds fires of all time inside the visible part of the map.
                        The country and dates above are not used.
                        {view && ` Current view height: ${formatKm(view.heightKm)}.`}
                        {!areaReady && ` Zoom in until it is ${MAX_AREA_KM} km or less.`}
                        {areaStatus === "loaded" && " Loaded!"}
                        {areaStatus === "empty" && " No fires found in this area."}
                        {areaStatus === "error" && " Could not load fires."}
                    </p>
                </section>
            </div>

            <div className="map-wrapper">
                <FireMap
                    center={center}
                    fire={fire}
                    fires={fires}
                    onViewChange={setView}
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