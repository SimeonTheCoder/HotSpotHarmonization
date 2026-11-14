import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

interface FireMapProps {
    center: [number, number];
    zoom?: number;
}

function MapUpdater({
    center,
    zoom,
}: {
    center: [number, number];
    zoom?: number;
}) {
    const map = useMap();
    const [lat, lng] = center;

    useEffect(() => {
        map.setView([lat, lng], zoom);
    }, [lat, lng, zoom, map]);

    // re-measure whenever the container changes size
    useEffect(() => {
        const container = map.getContainer();
        const observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(container);
        return () => observer.disconnect();
    }, [map]);

    return null;
}

function FireMap({ center, zoom = 6 }: FireMapProps) {
    return (
        <MapContainer
            center={center}
            zoom={zoom}
            minZoom={3}
            maxZoom={18}
            style={{ height: "100%", width: "100%" }}
        >
            <MapUpdater center={center} zoom={zoom} />
            <TileLayer
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={18}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
        </MapContainer>
    );
}

export default FireMap;
