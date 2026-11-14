import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import MapPage from "./pages/MapPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Map" element={<MapPage />} />
        </Routes>
      </main>
      <footer className="footer">
        Data: NASA FIRMS (MODIS and VIIRS active fire detections)
      </footer>
    </BrowserRouter>
  );
}

export default App;