import { useEffect, useRef } from "react";
import L from "leaflet";
import {
    GeoJSON,
    MapContainer,
    TileLayer,
    useMap,
    useMapEvents,
} from "react-leaflet";
import type { Feature } from "geojson";

interface FireMapProps {
    center: [number, number];
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
}: FireMapProps) {
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

function FireMap(props: FireMapProps) {
    return (
        <MapContainer
            center={props.center}
            zoom={6}
            minZoom={3}
            maxZoom={18}
            style={{ height: "100%", width: "100%" }}
        >
            <MapController {...props} />
            <TileLayer
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={18}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
        </MapContainer>
    );
}

export default FireMap;