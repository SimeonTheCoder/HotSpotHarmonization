function Header() {
  // Clicking "Home" scrolls back to the top of the page
  const goHome = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <header className="header">
      <div className="logo">
        Hot<span>Spot</span> Harmonization
      </div>

      <nav className="nav">
        <button className="nav-btn active" onClick={goHome}>Home</button>
        {/* These three do nothing yet */}
        <button className="nav-btn">Statistics</button>
        <button className="nav-btn">Map</button>
        <button className="nav-btn">Predictions</button>
      </nav>
    </header>
  )
}

export default Header