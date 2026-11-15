import { useEffect, useState } from "react";
import Combobox, { type Option } from "../components/Combobox";
import StatsChart, { type ChartKind, type Series } from "../components/StatsChart";
import countries from "../data/countries";
import { fireTypes, type FireType } from "../data/fireTypes";
import { getKeyNumbers } from "../data/keyNumbers";
import { getCountryMonthly, type MonthlyRow } from "../data/mockData";

const FROM = 2001;
const TO = 2025;

const SAME_YEAR_ERROR = "Error: you cannot select the same year twice.";

const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const countryOptions: Option[] = countries.map((c) => ({ value: c.code, label: c.label }));

const typeOptions: Option[] = [
    { value: "line", label: "Line chart" },
    { value: "bar", label: "Bar chart" },
    { value: "stepped", label: "Stepped line chart" },
    { value: "points", label: "Line chart with point shapes" },
    { value: "pie", label: "Pie chart (months of one year)" },
];

const dataOptions: Option[] = [
    { value: "year", label: "Per year (2001 to 2025)" },
    { value: "month", label: "Per month in one year" },
    { value: "compare", label: "Compare two years" },
];

const yearOptions: Option[] = [];
for (let y = TO; y >= FROM; y--) yearOptions.push({ value: String(y), label: String(y) });

const years: string[] = [];
for (let y = FROM; y <= TO; y++) years.push(String(y));

// 12345 becomes "12,345"
function fmt(n: number): string {
    return n.toLocaleString("en-US");
}

// finds the highest and the lowest number, with the name that belongs to it
function extremes(names: string[], values: (number | null)[]) {
    let most = -1;
    let least = -1;
    values.forEach((v, i) => {
        if (v === null) return;
        if (most === -1 || v > (values[most] ?? 0)) most = i;
        if (least === -1 || v < (values[least] ?? 0)) least = i;
    });
    if (most === -1) return null;
    return {
        most: { name: names[most], value: values[most] as number },
        least: { name: names[least], value: values[least] as number },
    };
}

// gives the browser a file to save
function saveFile(url: string, fileName: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
}

function Statistics() {
    const [country, setCountry] = useState("BGR");
    const [kind, setKind] = useState("line");
    const [view, setView] = useState("year"); // "year", "month" or "compare"
    const [monthYear, setMonthYear] = useState("2025"); // used when view is "month"
    const [yearA, setYearA] = useState("2024"); // used when view is "compare"
    const [yearB, setYearB] = useState("2025");
    const [types, setTypes] = useState<FireType[]>(["vegetation"]);
    const [rows, setRows] = useState<MonthlyRow[]>([]);

    // the pie chart always shows the 12 months of one year
    const isPie = kind === "pie";
    const shownView = isPie ? "month" : view;

    const countryName = countries.find((c) => c.code === country)?.label ?? "";

    function toggleType(type: FireType) {
        setTypes(types.includes(type) ? types.filter((t) => t !== type) : [...types, type]);
    }

    // load the monthly data again every time another country or other types are chosen
    useEffect(() => {
        let cancelled = false;
        getCountryMonthly(country, FROM, TO, types).then((result) => {
            if (!cancelled) setRows(result);
        });
        return () => {
            cancelled = true;
        };
    }, [country, types]);

    const typeNames = fireTypes.filter((t) => types.includes(t.value)).map((t) => t.label);
    const numbers = getKeyNumbers(rows);

    // the 12 monthly numbers of one year, or null if that month has no data
    function monthValues(year: string): (number | null)[] {
        return MONTHS.map(
            (_, i) =>
                rows.find((r) => r.year === Number(year) && r.month === i + 1)?.hotspots ?? null,
        );
    }

    // the lines for the chart, depending on what the user chose
    let labels: string[];
    let series: Series[];
    let title: string;
    let yTitle: string;
    let sentence = ""; // one sentence that says what the chart shows

    if (shownView === "year") {
        labels = years;
        // add the months of every year to get one number per year
        const values = years.map((year) =>
            rows.filter((r) => r.year === Number(year)).reduce((sum, r) => sum + r.hotspots, 0),
        );
        series = [{ name: countryName, values }];
        title = `Hotspots per year in ${countryName}, ${FROM} to ${TO}`;
        yTitle = "Hotspots per year";

        const e = extremes(years, values);
        if (e) {
            sentence = `${countryName} had the most hotspots in ${e.most.name} (${fmt(e.most.value)}) and the fewest in ${e.least.name} (${fmt(e.least.value)}).`;
        }
    } else if (shownView === "month") {
        labels = MONTHS;
        const values = monthValues(monthYear);
        series = [{ name: countryName, values }];
        title = isPie
            ? `Share of each month in ${countryName}, ${monthYear}`
            : `Hotspots per month in ${countryName}, ${monthYear}`;
        yTitle = "Hotspots per month";

        const e = extremes(FULL_MONTHS, values);
        if (e) {
            const total = values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
            const percent = (v: number) => (isPie ? `, ${Math.round((v / total) * 100)}% of the year` : "");
            sentence = `In ${monthYear}, the most hotspots were in ${e.most.name} (${fmt(e.most.value)}${percent(e.most.value)}) and the fewest in ${e.least.name} (${fmt(e.least.value)}${percent(e.least.value)}).`;
        }
    } else {
        // compare: one line for each of the two years
        labels = MONTHS;
        const valuesA = monthValues(yearA);
        const valuesB = monthValues(yearB);
        series = [
            { name: yearA, values: valuesA },
            { name: yearB, values: valuesB },
        ];
        title = `Hotspots per month in ${countryName}: ${yearA} and ${yearB}`;
        yTitle = "Hotspots per month";

        const totalA = valuesA.reduce<number>((sum, v) => sum + (v ?? 0), 0);
        const totalB = valuesB.reduce<number>((sum, v) => sum + (v ?? 0), 0);
        if (totalA > 0) {
            const percent = Math.round((totalB / totalA - 1) * 100);
            const how =
                percent === 0
                    ? "about the same number of hotspots as"
                    : `${Math.abs(percent)}% ${percent > 0 ? "more" : "fewer"} hotspots than`;
            sentence = `${yearB} had ${how} ${yearA} (${fmt(totalB)} against ${fmt(totalA)}).`;
        }
    }

    const fileName = `hotspots-${countryName.toLowerCase().replace(/\s+/g, "-")}-${shownView}`;

    // saves the diagram as a picture (the canvas has a see-through background, so we paint it white)
    function downloadImage() {
        const canvas = document.querySelector<HTMLCanvasElement>(".stats-chart canvas");
        if (!canvas) return;
        const copy = document.createElement("canvas");
        copy.width = canvas.width;
        copy.height = canvas.height;
        const ctx = copy.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, copy.width, copy.height);
        ctx.drawImage(canvas, 0, 0);
        saveFile(copy.toDataURL("image/png"), `${fileName}.png`);
    }

    // saves the numbers of the diagram as a CSV file
    function downloadCsv() {
        const firstColumn = shownView === "year" ? "Year" : "Month";
        const lines = [[firstColumn, ...series.map((s) => s.name)].join(",")];
        labels.forEach((label, i) => {
            lines.push([label, ...series.map((s) => s.values[i] ?? "")].join(","));
        });
        const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
        saveFile(url, `${fileName}.csv`);
        URL.revokeObjectURL(url);
    }

    // in the compare view, the key numbers are only about the two chosen years
    let compareGlance: {
        totalA: number;
        totalB: number;
        percent: number | null;
        peakA: string;
        peakB: string;
    } | null = null;
    if (shownView === "compare") {
        const sum = (values: (number | null)[]) => values.reduce<number>((s, v) => s + (v ?? 0), 0);
        const totalA = sum(series[0].values);
        const totalB = sum(series[1].values);
        compareGlance = {
            totalA,
            totalB,
            percent: totalA > 0 ? Math.round((totalB / totalA - 1) * 100) : null,
            peakA: extremes(FULL_MONTHS, series[0].values)?.most.name ?? "n/a",
            peakB: extremes(FULL_MONTHS, series[1].values)?.most.name ?? "n/a",
        };
    }

    const noTypes = types.length === 0;
    const marksHighest = !isPie && series.length === 1;

    return (
        <>
            <section className="page-hero">
                <div className="page-hero-inner">
                    <h2>Statistics</h2>
                    <p>
                        Choose a country and a type of fire to see how many hotspots the
                        satellites counted, year by year or month by month.
                    </p>
                </div>
            </section>

            <div className="stats-bar">
                <div className="stats-bar-inner">
                    <div className="stats-fields">
                        <div className="field">
                            <label htmlFor="country">Country</label>
                            <Combobox
                                id="country"
                                options={countryOptions}
                                value={country}
                                onChange={setCountry}
                                placeholder="Type a country name"
                            />
                        </div>

                        {!isPie && (
                            <div className="field">
                                <label htmlFor="data">Data</label>
                                <Combobox id="data" options={dataOptions} value={view} onChange={setView} />
                            </div>
                        )}

                        {shownView === "compare" && (
                            <>
                                <div className="field">
                                    <label htmlFor="year-a">First year</label>
                                    <Combobox
                                        id="year-a"
                                        options={yearOptions.filter((o) => o.value !== yearB)}
                                        blocked={{ label: yearB, message: SAME_YEAR_ERROR }}
                                        value={yearA}
                                        onChange={setYearA}
                                        placeholder="Type a year"
                                    />
                                </div>
                                <div className="field">
                                    <label htmlFor="year-b">Second year</label>
                                    <Combobox
                                        id="year-b"
                                        options={yearOptions.filter((o) => o.value !== yearA)}
                                        blocked={{ label: yearA, message: SAME_YEAR_ERROR }}
                                        value={yearB}
                                        onChange={setYearB}
                                        placeholder="Type a year"
                                    />
                                </div>
                            </>
                        )}

                        {shownView === "month" && (
                            <div className="field">
                                <label htmlFor="year">Year</label>
                                <Combobox
                                    id="year"
                                    options={yearOptions}
                                    value={monthYear}
                                    onChange={setMonthYear}
                                    placeholder="Type a year"
                                />
                            </div>
                        )}

                        <div className="field">
                            <label htmlFor="type">Type of diagram</label>
                            <Combobox id="type" options={typeOptions} value={kind} onChange={setKind} />
                        </div>
                    </div>

                    <fieldset className="types">
                        <legend>Type of fire</legend>
                        <div className="types-row">
                            {fireTypes.map((t) => (
                                <label key={t.value} className="check">
                                    <input
                                        type="checkbox"
                                        checked={types.includes(t.value)}
                                        onChange={() => toggleType(t.value)}
                                    />
                                    {t.label}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </div>
            </div>

            <div className="stats-page">
                {noTypes ? (
                    <p className="stats-message">Choose at least one type of fire to see the numbers.</p>
                ) : (
                    <>
                        {compareGlance && (
                            <section aria-label={`Key numbers for ${countryName}`}>
                                <h3 className="key-title">
                                    {countryName} at a glance, {yearA} and {yearB}
                                </h3>
                                <div className="key-numbers">
                                    <div className="key-number">
                                        <p className="big">{fmt(compareGlance.totalA)}</p>
                                        <p className="small">hotspots in {yearA}</p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">{fmt(compareGlance.totalB)}</p>
                                        <p className="small">hotspots in {yearB}</p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">
                                            {compareGlance.percent === null
                                                ? "n/a"
                                                : `${compareGlance.percent > 0 ? "+" : ""}${compareGlance.percent}%`}
                                        </p>
                                        <p className="small">
                                            {yearB} compared with {yearA}
                                        </p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">{compareGlance.peakB}</p>
                                        <p className="small">
                                            the busiest month in {yearB} (in {yearA}: {compareGlance.peakA})
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {!compareGlance && numbers && (
                            <section aria-label={`Key numbers for ${countryName}`}>
                                <h3 className="key-title">
                                    {countryName} at a glance, {FROM} to {TO}
                                </h3>
                                <div className="key-numbers">
                                    <div className="key-number">
                                        <p className="big">{fmt(numbers.total)}</p>
                                        <p className="small">hotspots in total</p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">{numbers.worstYear.year}</p>
                                        <p className="small">
                                            worst year, with {fmt(numbers.worstYear.hotspots)} hotspots
                                        </p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">{FULL_MONTHS[numbers.peakMonth - 1]}</p>
                                        <p className="small">the busiest month in a usual year</p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">{fmt(numbers.averagePerYear)}</p>
                                        <p className="small">hotspots in an average year</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        <div className="stats-result">
                            <h3>{title}</h3>
                            {sentence && <p className="sentence">{sentence}</p>}
                            <p className="counted">Counted: {typeNames.join(", ").toLowerCase()}.</p>

                            <div
                                className="stats-chart"
                                key={`${kind}-${shownView}-${country}-${types.join("")}`}
                            >
                                <StatsChart
                                    kind={kind as ChartKind}
                                    labels={labels}
                                    series={series}
                                    yTitle={yTitle}
                                />
                            </div>

                            <div className="chart-actions">
                                <p className="counted">
                                    {isPie
                                        ? "Darker slices mean more hotspots."
                                        : marksHighest
                                          ? "The red mark shows the highest value."
                                          : ""}
                                </p>
                                <div className="buttons">
                                    <button type="button" className="button" onClick={downloadImage}>
                                        Download image (PNG)
                                    </button>
                                    <button type="button" className="button" onClick={downloadCsv}>
                                        Download numbers (CSV)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

export default Statistics;
