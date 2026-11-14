import { NavLink } from "react-router-dom";

function Header() {
    return (
        <header className="header">
            <div className="logo">
                Hot<span>Spot</span> Harmonization
            </div>

            <nav className="nav">
                <NavLink to="/" end className="nav-btn nav-home">Home</NavLink>
                <NavLink to="/statistics" className="nav-btn nav-stats">Statistics</NavLink>
                <NavLink to="/map" className="nav-btn nav-map">Map</NavLink>
                <NavLink to="/predictions" className="nav-btn nav-pred">Predictions</NavLink>
            </nav>
        </header>
    );
}

export default Header;
