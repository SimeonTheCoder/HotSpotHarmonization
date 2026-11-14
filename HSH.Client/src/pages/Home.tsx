function Home() {
  return (
    <>
      <section className="hero">
        <h1>Fire seasons, side by side.</h1>
        <p>
          Two decades of satellite fire data, harmonized into one clear
          picture, so patterns, trends and unusual fire seasons are easy to spot.
        </p>
      </section>
      <div className="stripe" />

      <section className="section">
        <h2>What is this site?</h2>
        <p>
          Satellites have been detecting active fire hotspots since the early
          2000s. This website combines those records into one burning activity
          calendar that emergency responders, scientists and land managers can
          use to explore fire history in any area.
        </p>
      </section>

      <section className="section">
        <h2>The problem: two satellites</h2>
        <p>
          NASA has used two different instruments to detect fires, and their
          numbers cannot be compared directly.
        </p>
        <div className="cards">
          <div className="card card-gold">
            <h3>MODIS</h3>
            <p>
              The older instrument, on the Terra and Aqua satellites. Its
              pixels are about 1 km wide, and it has watched since the early
              2000s. Its satellites are nearing the end of their life.
            </p>
          </div>
          <div className="card card-red">
            <h3>VIIRS</h3>
            <p>
              The newer instrument, with pixels about 375 m wide. It sees
              smaller fires, so it reports many more hotspots, and it is
              replacing MODIS.
            </p>
          </div>
        </div>
        <p>
          Joining the two without care would create a fake jump in fire
          activity when the instrument changed. Harmonization fixes that.
        </p>
      </section>

      <section className="section">
        <h2>Reading the results</h2>
        <ul className="notes">
          <li>
            <strong>One fire, several detections.</strong> One MODIS pixel can
            cover several VIIRS pixels, so a single MODIS hotspot is often
            paired with several VIIRS ones. We group them and count them as
            one fire.
          </li>
          <li>
            <strong>Fire size.</strong> To compare size between the sensors,
            we add up the VIIRS fire radiative power (FRP) inside each group
            and compare it with the MODIS FRP. Pixel brightness alone cannot
            be compared, because the sensors measure in different bands.
          </li>
          <li>
            <strong>Confidence is not the same scale.</strong> MODIS gives a
            number from 0 to 100. VIIRS gives low, nominal or high. To combine
            them, MODIS is converted to the same three levels, for example
            below 30 is low, 30 to 80 is nominal and above 80 is high.
          </li>
          <li>
            <strong>Heat that is not a wildfire.</strong> Some detections come
            from static land sources such as industrial heat, not from
            vegetation fires. They repeat in the same place, so we filter them
            out and keep only vegetation fires.
          </li>
        </ul>
      </section>

      <section className="section">
        <h2>What you can do here</h2>
        <div className="cards">
          <div className="card card-yellow">
            <h3>Statistics</h3>
            <p>Explore fire numbers and compare them with the past.</p>
          </div>
          <div className="card card-orange">
            <h3>Map</h3>
            <p>See fire activity country by country on a world map.</p>
          </div>
          <div className="card card-red">
            <h3>Predictions</h3>
            <p>Look ahead at expected fire activity.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>How it works</h2>
        <ol className="steps">
          <li><span className="step-num">1</span>
            <span>We collect active fire hotspots from NASA FIRMS.</span></li>
          <li><span className="step-num">2</span>
            <span>We harmonize MODIS and VIIRS into one consistent record.</span></li>
          <li><span className="step-num">3</span>
            <span>You explore the results in a burning activity calendar.</span></li>
        </ol>
      </section>
    </>
  )
}

export default Home