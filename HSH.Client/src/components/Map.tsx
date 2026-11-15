import { useCallback, useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import {
    GeoJSON,
    ImageOverlay,
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    useMap,
    useMapEvents,
} from "react-leaflet";
import type { Feature } from "geojson";
import type { FireDetection } from "../data/mapFireData";
import { HEATMAP_BOUNDS } from "../data/heatmap";

// one fire that is shown with the fire icon (opened from the statistics page)
export interface FireSpot {
    lat: number;
    lon: number;
    date?: string;
    brightness?: number;
}

// the visible area of the map, reported to the page
export interface MapView {
    north: number;
    south: number;
    west: number;
    east: number;
    heightKm: number; // north-to-south distance of the visible area
}

// the "fire" icon of Bootstrap Icons (https://icons.getbootstrap.com/icons/fire/), MIT licence
function makeFireIcon(size: number, anchorY: number, popupY: number) {
    return L.divIcon({
        className: "fire-marker",
        html: renderToStaticMarkup(
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                fill="currentColor"
                viewBox="0 0 16 16"
            >
                <path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16m0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15" />
            </svg>,
        ),
        iconSize: [size, size],
        iconAnchor: [size / 2, anchorY], // the flame stands on the exact spot
        popupAnchor: [0, popupY],
    });
}

const fireIcon = makeFireIcon(40, 36, -34); // the single fire opened from statistics
const areaFireIcon = makeFireIcon(28, 25, -24); // fires found by "Search this area"

// fires from "Search by country and dates" can be tens of thousands, so they are drawn as small dots
// on one canvas (fast) instead of one SVG icon per fire (slow)
const dotRenderer = L.canvas({ padding: 0.5 });

function FireDots({ fires }: { fires: FireDetection[] }) {
    const map = useMap();

    useEffect(() => {
        if (fires.length === 0) return;
        const layer = L.layerGroup(
            fires.map((f) =>
                L.circleMarker([f.latitude, f.longitude], {
                    renderer: dotRenderer,
                    radius: 3,
                    color: "#C42B2B",
                    weight: 1,
                    fillColor: "#FF8A00",
                    fillOpacity: 0.85,
                }).bindPopup(
                    `<strong>Fire</strong><br />${f.latitude.toFixed(3)}, ${f.longitude.toFixed(3)}`,
                ),
            ),
        ).addTo(map);
        return () => {
            layer.remove();
        };
    }, [fires, map]);

    return null;
}

// puts the fire on the map, moves the map to it and opens its popup
function FireMarker({ fire }: { fire: FireSpot }) {
    const map = useMap();
    const marker = useRef<L.Marker>(null);

    useEffect(() => {
        map.setView([fire.lat, fire.lon], 10, { animate: false });
        marker.current?.openPopup();
    }, [fire.lat, fire.lon, map]);

    return (
        <Marker ref={marker} position={[fire.lat, fire.lon]} icon={fireIcon}>
            <Popup>
                <strong>Fire</strong>
                <br />
                {fire.lat.toFixed(3)}, {fire.lon.toFixed(3)}
                {fire.date && (
                    <>
                        <br />
                        {fire.date}
                    </>
                )}
                {fire.brightness !== undefined && (
                    <>
                        <br />
                        {fire.brightness} K
                    </>
                )}
            </Popup>
        </Marker>
    );
}

interface FireMapProps {
    center: [number, number];
    fire?: FireSpot | null;
    fires?: FireDetection[]; // fires from "Search this area"
    countryFires?: FireDetection[]; // fires from "Search by country and dates", drawn as dots
    heatmapUrl?: string | null; // the world heatmap picture; null hides it
    onViewChange?: (view: MapView) => void; // reports the visible area
    feature: Feature | null;
    highlighted: boolean;
    selectionId: number;
    onClear: () => void;
}

function MapController({
    center,
    feature,
    highlighted,
    selectionId,
    onClear,
}: Pick<
    FireMapProps,
    "center" | "feature" | "highlighted" | "selectionId" | "onClear"
>) {
    const map = useMap();
    const moving = useRef(false);
    const [lat, lng] = center;

    // Move the map when a country is picked
    useEffect(() => {
        moving.current = true; // our own move: don't clear the highlight
        if (feature) {
            map.fitBounds(L.geoJSON(feature).getBounds(), {
                padding: [20, 20],
                maxZoom: 9,
                animate: false,
            });
        } else {
            map.setView([lat, lng], 6, { animate: false });
        }
        moving.current = false; // non-animated moves finish synchronously
    }, [feature, lat, lng, selectionId, map]);

    // Any move by the user removes the highlight
    useMapEvents({
        movestart: () => {
            if (!moving.current) onClear();
        },
    });

    if (!feature || !highlighted) return null;

    return (
        <GeoJSON
            key={`${selectionId}-${String(feature.properties?.["ISO3166-1-Alpha-3"])}`}
            data={feature}
            style={{
                color: "#FF8A00",
                weight: 3,
                fillColor: "#FF8A00",
                fillOpacity: 0.08,
            }}
            interactive={false}
        />
    );
}

// Reports the visible area (corners and height in km) to the page
function ViewReporter({ onViewChange }: Pick<FireMapProps, "onViewChange">) {
    const map = useMap();

    const report = useCallback(() => {
        if (!onViewChange) return;
        const b = map.getBounds();
        onViewChange({
            north: b.getNorth(),
            south: b.getSouth(),
            west: b.getWest(),
            east: b.getEast(),
            heightKm: map.distance(b.getNorthWest(), b.getSouthWest()) / 1000,
        });
    }, [map, onViewChange]);

    useEffect(() => {
        report(); // initial value
    }, [report]);

    useMapEvents({
        moveend: report,
        zoomend: report,
        resize: report,
    });

    return null;
}

function FireMap({
    center,
    fire,
    fires = [],
    countryFires = [],
    heatmapUrl = null,
    onViewChange,
    feature,
    highlighted,
    selectionId,
    onClear,
}: FireMapProps) {
    return (
        <MapContainer
            center={center}
            zoom={6}
            minZoom={3}
            maxZoom={18}
            style={{ height: "100%", width: "100%" }}
        >
            <MapController
                center={center}
                feature={feature}
                highlighted={highlighted}
                selectionId={selectionId}
                onClear={onClear}
            />
            <ViewReporter onViewChange={onViewChange} />

            {fire && <FireMarker fire={fire} />}
            <FireDots fires={countryFires} />

            <TileLayer
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={18}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* the world heatmap: one coloured square per area, more opaque where there were more fires */}
            {heatmapUrl && (
                <ImageOverlay
                    url={heatmapUrl}
                    bounds={HEATMAP_BOUNDS}
                    className="heatmap-overlay"
                    interactive={false}
                />
            )}

            {fires.map((f) => (
                <Marker
                    key={f.id}
                    position={[f.latitude, f.longitude]}
                    icon={areaFireIcon}
                >
                    <Popup>
                        <strong>Fire</strong>
                        <br />
                        {f.latitude.toFixed(3)}, {f.longitude.toFixed(3)}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}

export default FireMap;
