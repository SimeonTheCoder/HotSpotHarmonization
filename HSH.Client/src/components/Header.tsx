import { Link, NavLink } from "react-router-dom";

function Header() {
    return (
        <header className="header">
            <Link to="/" className="logo">
                Hot<span>Spot</span> Harmonization
            </Link>

            <nav className="nav">
                <NavLink to="/" end className="nav-btn nav-home">Home</NavLink>
                <NavLink to="/statistics" className="nav-btn nav-stats">Statistics</NavLink>
                <NavLink to="/map" className="nav-btn nav-map">Map</NavLink>
            </nav>
        </header>
    );
}

export default Header;
