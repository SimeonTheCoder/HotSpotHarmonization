// The years the drawing covers, and where the bars start and end (x position)
const START_YEAR = 2000;
const END_YEAR = 2026; // today
const LEFT = 40;
const RIGHT = 780;

function x(year: number) {
    return LEFT + ((year - START_YEAR) / (END_YEAR - START_YEAR)) * (RIGHT - LEFT);
}

const ticks = [2000, 2005, 2010, 2015, 2020]; // the end of the line says "today"

// when each instrument has been watching, and the years where both are
// VIIRS (the newer one) is the top bar, MODIS (watching all along) is the bottom bar
function Timeline() {
    return (
        <svg
            viewBox="0 0 820 240"
            className="timeline"
            role="img"
            aria-label="MODIS has watched since 2000 and VIIRS since 2012, so both have watched together from 2012 until today"
        >
            {/* both instruments watch from 2012 */}
            <rect
                x={x(2012)}
                y="20"
                width={x(END_YEAR) - x(2012)}
                height="140"
                rx="6"
                className="tl-overlap"
            />
            <text x={x(2012) + 8} y="184" className="tl-note">
                Both watch: 2012 to today
            </text>

            <rect x={x(2012)} y="32" width={x(END_YEAR) - x(2012)} height="44" rx="6" className="tl-viirs" />
            <text x={x(2012) + 14} y="60" className="tl-label">VIIRS (Suomi NPP, NOAA-20, NOAA-21)</text>

            <rect x={x(2000)} y="92" width={x(END_YEAR) - x(2000)} height="44" rx="6" className="tl-modis" />
            <text x={x(2000) + 14} y="120" className="tl-label">MODIS (Terra, Aqua)</text>

            {/* the years */}
            <line x1={LEFT} x2={RIGHT} y1="204" y2="204" className="tl-axis" />
            {ticks.map((year) => (
                <g key={year}>
                    <line x1={x(year)} x2={x(year)} y1="204" y2="212" className="tl-axis" />
                    <text x={x(year)} y="230" textAnchor="middle" className="tl-year">{year}</text>
                </g>
            ))}
            <text x={RIGHT} y="230" textAnchor="middle" className="tl-year">today</text>
        </svg>
    );
}

export default Timeline;
