import FireMap from "../components/Map";

const DEFAULT_CENTER: [number, number] = [42.7, 25.3];

function MapPage() {
    return (
        <div className="map-page">
            <h2 className="map-title">Fire map</h2>

            <div className="map-wrapper">
                <FireMap center={DEFAULT_CENTER} />
            </div>
        </div>
    );
}

export default MapPage;
