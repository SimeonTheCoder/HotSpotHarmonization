import { Link } from "react-router-dom";
import modisImage from "../assets/modis-satellite.jpg";
import viirsImage from "../assets/viirs-satellite.jpg";
import Timeline from "../components/Timeline";
import useReveal from "../hooks/useReveal";

function Home() {
  useReveal();

  return (
    <>
      <section className="main">
        <div className="main-inner">
          <div>
            <h1>Fire seasons, side by side.</h1>
            <p>
              Two decades of satellite fire data, harmonized into one clear
              picture, so patterns, trends and unusual fire seasons are easy to spot.
            </p>
          </div>
        </div>
      </section>

      <section className="band band-light">
        <div className="section split reveal">
          <h2>What is this site?</h2>
          <p>
            Satellites have been detecting active fire hotspots since the early
            2000s. This website combines those records into one burning activity
            calendar that emergency responders, scientists and land managers can
            use to explore fire history in any area.
          </p>
        </div>
      </section>

      <section className="band band-dark">
        <div className="section reveal">
          <h2>Who is it for?</h2>
          <ul className="notes">
            <li>
              <strong>Firefighters and fire services.</strong> They plan crews,
              patrols and fire bans around the months when fires are most
              likely, and they can see whether fire activity in their country
              has been rising over the years.
            </li>
            <li>
              <strong>Geologists and volcanologists.</strong> They can follow
              hotspots at volcanoes separately from wildfires, and save the
              numbers to use in their own tools.
            </li>
            <li>
              <strong>Ecologists and other scientists.</strong> They study how
              fire activity changes over many years, so they need counts that
              can be compared from one year to the next.
            </li>
          </ul>
        </div>
      </section>

      <section className="band band-light">
        <div className="section reveal">
          <h2>How can it be used?</h2>

          <h3>A firefighter planning the season</h3>
          <p>
            On the Statistics page, choose a country and a year, then choose the
            pie chart. It shows which months had the most and the fewest
            hotspots, so crews and equipment can be ready before the worst
            months. The key numbers also name the busiest month in a usual
            year, which helps to decide when to start early patrols and when to
            ask for fire bans. To see whether a season is arriving earlier or
            later than last year, compare two years month by month.
          </p>
          <p>
            Over the longer term, the yearly line chart shows whether the number
            of hotspots in a country has gone up or down since 2001. That can
            support a request for more crews or equipment. Keep in mind that
            hotspots are detections from space, not a direct measure of risk.
          </p>
          <p>
            Only vegetation fires are counted at first. Heat from factories and
            gas platforms are separate types and stay out of the numbers until
            you switch them on, so they do not distort the picture of wildfires.
          </p>

          <h3>A geologist following volcanoes</h3>
          <p>
            Switch on the Active volcano type to count the hotspots detected at
            volcanoes in a country, year by year, apart from wildfires. The site
            works with whole countries, so it does not show single volcanoes,
            and countries without active volcanoes will show none.
          </p>
          <p>
            Download numbers (CSV) saves the numbers behind any chart, for a
            spreadsheet or other software. The file holds counts for each year
            or month, not the locations of the hotspots.
          </p>

          <h3>An ecologist studying a trend</h3>
          <p>
            Choose the line chart with the yearly totals to see how fire
            activity has changed since 2001 in one country. Because MODIS and
            VIIRS are harmonized, a rise or fall in the line comes from the
            fires and not from the change of instrument. Compare a dry year with
            a wet one to see how the weather shaped the fire season.
          </p>

          <p>
            This site looks back at history. It is not a live alert system, and
            it counts hotspots seen from space, not the size of a fire on the
            ground.
          </p>
        </div>
      </section>

      <section className="band band-dark">
        <div className="section reveal">
          <h2>The problem: two satellites</h2>
          <p>
            NASA has used two different instruments to detect fires, and their
            numbers cannot be compared directly.
          </p>

          <div className="problem">
            <figure className="instrument">
              <img
                className="photo"
                src={modisImage}
                width="780"
                height="438"
                alt="Artist rendering of a MODIS satellite above the Earth"
              />
              <figcaption>Artist rendering of a satellite that carries MODIS.</figcaption>
              <h3>MODIS</h3>
              <p>
                The older instrument, on the Terra and Aqua satellites. Its
                pixels are about 1 km wide, and it has watched since the early
                2000s. Its satellites are nearing the end of their life.
              </p>
            </figure>
            <figure className="instrument">
              <img
                className="photo"
                src={viirsImage}
                width="1280"
                height="1024"
                alt="Artist rendering of a satellite that carries VIIRS"
              />
              <figcaption>
                Artist rendering of a satellite that carries VIIRS. Image: NASA Earthdata.
              </figcaption>
              <h3>VIIRS</h3>
              <p>
                The newer instrument, with pixels about 375 m wide. It sees
                smaller fires, so it reports many more hotspots, and it is
                replacing MODIS.
              </p>
            </figure>
          </div>

          <h3>Two instruments, one timeline</h3>
          <Timeline />
          <p>
            From 2012 both instruments watched the same fires. That overlap is
            what lets us compare them, and it matters more as MODIS nears the
            end of its life. Joining the two without care would create a fake
            jump in fire activity when the instrument changed. Harmonization
            fixes that.
          </p>
        </div>
      </section>

      <section className="band band-light">
        <div className="section split reveal">
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
              from volcanoes, industrial heat or gas platforms, not from
              vegetation fires. They repeat in the same place, so the Statistics
              page counts only vegetation fires at first. You can switch the
              other types on and look at them separately.
            </li>
          </ul>
        </div>
      </section>

      <section className="band band-dark">
        <div className="section reveal">
          <h2>What can you do here?</h2>
          <ul className="goto">
            <li>
              <Link to="/statistics">Statistics</Link>
              <p>Explore fire numbers and compare them with the past.</p>
            </li>
            <li>
              <Link to="/map">Map</Link>
              <p>See fire activity country by country on a world map.</p>
            </li>
            <li>
              <Link to="/predictions">Predictions</Link>
              <p>Look ahead at expected fire activity.</p>
            </li>
          </ul>
        </div>
      </section>
    </>
  )
}

export default Home
