import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FireMap, { type FireSpot, type MapView } from "../components/Map";
import CountryDropdown from "../components/CountryFilter";
import DateRangeFilter from "../components/DateRangeFilter";
import type { CountryOption } from "../data/countries";
import { getCountryAt, getCountryFeature } from "../data/countryShapes";
import {
    getFireDetections,
    getFiresInArea,
    type FireDetection,
} from "../data/mapFireData";
import { loadHeatmap } from "../data/heatmap";
import { addMonths, today } from "../utils/dates";

const DEFAULT_CENTER: [number, number] = [42.7, 25.3];
const MAX_AREA_KM = 10; // the view must be this tall (north to south) or less

type Status = "idle" | "loading" | "loaded" | "error";
type AreaStatus = "idle" | "loading" | "loaded" | "empty" | "error";
type HeatmapStatus = "idle" | "loading" | "generating" | "loaded" | "error";

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
    const [countryFires, setCountryFires] = useState<FireDetection[]>([]); // drawn as small dots
    const abortRef = useRef<AbortController | null>(null);

    // search by map view ("Search this area"): all dates, ignores the filters above;
    // it searches the country under the centre of the view
    const [view, setView] = useState<MapView | null>(null);
    const [fires, setFires] = useState<FireDetection[]>([]);
    const [areaStatus, setAreaStatus] = useState<AreaStatus>("idle");
    const areaAbortRef = useRef<AbortController | null>(null);

    // world heatmap overlay: off by default, loaded the first time it is switched on, then kept
    const [heatmapOn, setHeatmapOn] = useState(false);
    const [heatmapUrl, setHeatmapUrl] = useState<string | null>(null);
    const [heatmapStatus, setHeatmapStatus] = useState<HeatmapStatus>("idle");
    const heatmapAbortRef = useRef<AbortController | null>(null);

    const handleHeatmapToggle = (on: boolean) => {
        setHeatmapOn(on);
        if (!on) {
            heatmapAbortRef.current?.abort(); // stop waiting (the server keeps building it for next time)
            if (!heatmapUrl) setHeatmapStatus("idle");
            return;
        }
        if (heatmapUrl) return; // already loaded

        const controller = new AbortController();
        heatmapAbortRef.current = controller;
        setHeatmapStatus("loading");
        loadHeatmap(controller.signal, () => setHeatmapStatus("generating"))
            .then((url) => {
                setHeatmapUrl(url);
                setHeatmapStatus("loaded");
            })
            .catch((e: Error) => {
                if (e.name !== "AbortError") {
                    console.error(e);
                    setHeatmapStatus("error");
                }
            });
    };

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

    const zoomedIn = view !== null && view.heightKm <= MAX_AREA_KM;

    // the API searches one country, so we find the country under the centre of the view
    // (only when zoomed in enough, so the check does not run while the whole world is visible)
    const areaCountry = useMemo(() => {
        if (!view || view.heightKm > MAX_AREA_KM) return null;
        return getCountryAt((view.north + view.south) / 2, (view.west + view.east) / 2);
    }, [view]);

    const areaReady = zoomedIn && areaCountry !== null;

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
        setCountryFires([]); // the new search replaces the old dots
        getFireDetections(
            {
                start: range.start,
                end: range.end,
                countryCode: selectedCountry.value, // the API wants the 2-letter code ("BG")
            },
            controller.signal
        )
            .then((rows) => {
                setCountryFires(rows);
                setStatus("loaded");
            })
            .catch((e: Error) => {
                if (e.name !== "AbortError") setStatus("error");
            });
    };

    const handleSearchArea = () => {
        if (!view || view.heightKm > MAX_AREA_KM || !areaCountry) return;

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
                countryCode: areaCountry.code, // 2-letter code ("BG") of the country under the centre
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
        abortRef.current?.abort();
        setFires([]);
        setCountryFires([]);
        setAreaStatus("idle");
        setStatus("idle");
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
                        {status === "loaded" &&
                            (countryFires.length > 0
                                ? ` Loaded ${countryFires.length.toLocaleString()} fires.`
                                : " No fires found in this period.")}
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
                                !zoomedIn
                                    ? `Zoom in until the view is ${MAX_AREA_KM} km tall or less`
                                    : !areaCountry
                                      ? "Move the centre of the map over a country"
                                      : undefined
                            }
                        >
                            {areaStatus === "loading" ? "Searching..." : "Search this area"}
                        </button>

                        <button
                            className="map-apply map-clear"
                            onClick={handleClearMap}
                            disabled={fires.length === 0 && countryFires.length === 0}
                        >
                            Clear map
                        </button>
                    </div>

                    <p className="map-hint">
                        Finds fires of all time inside the visible part of the map.
                        The country and dates above are not used.
                        {view && ` Current view height: ${formatKm(view.heightKm)}.`}
                        {!zoomedIn && ` Zoom in until it is ${MAX_AREA_KM} km or less.`}
                        {zoomedIn &&
                            (areaCountry
                                ? ` Searching in: ${areaCountry.name}.`
                                : " Move the centre of the map over a country.")}
                        {areaStatus === "loaded" && " Loaded!"}
                        {areaStatus === "empty" && " No fires found in this area."}
                        {areaStatus === "error" && " Could not load fires."}
                    </p>
                </section>

                <section className="map-panel">
                    <h3 className="map-panel-title">
                        World heatmap ·
                        <span className="map-badge map-badge-all"> All time · Ignores filters</span>
                    </h3>

                    <div className="map-toolbar heatmap-toolbar">
                        <label className="check">
                            <input
                                type="checkbox"
                                checked={heatmapOn}
                                onChange={(e) => handleHeatmapToggle(e.target.checked)}
                            />
                            Show the fire density of the whole world
                        </label>

                        <div className="heatmap-legend" aria-hidden="true">
                            <span>Fewer fires</span>
                            <span className="heatmap-legend-bar" />
                            <span>More fires</span>
                        </div>
                    </div>

                    <p className="map-hint">
                        Each square is coloured by how many fires were detected in it; the more fires, the
                        stronger the colour.
                        {heatmapOn && heatmapStatus === "loading" && " Loading..."}
                        {heatmapOn &&
                            heatmapStatus === "generating" &&
                            " The server is building the heatmap for the first time, this can take a few minutes..."}
                        {heatmapOn && heatmapStatus === "error" && " Could not load the heatmap."}
                    </p>
                </section>
            </div>

            <div className="map-wrapper">
                <FireMap
                    center={center}
                    fire={fire}
                    fires={fires}
                    countryFires={countryFires}
                    heatmapUrl={heatmapOn ? heatmapUrl : null}
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