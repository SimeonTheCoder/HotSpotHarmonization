import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Combobox, { type Option } from "../components/Combobox";
import StatsChart, { type ChartKind, type Series } from "../components/StatsChart";
import {
    compareYears,
    getDayNight,
    getInstruments,
    getMonthly,
    getTopFires,
    type DayNight,
    type Fire,
    type InstrumentRow,
} from "../data/api";
import countries from "../data/countries";
import { fireTypes, type FireType } from "../data/fireTypes";
import type { MonthlyRow } from "../data/mockData";
import { STAT_TYPES, getStatData, type StatType } from "../data/statData";

const FROM = 2001;
const TO = 2025;

const SAME_YEAR_ERROR = "Error: you cannot select the same year twice.";

const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const countryOptions: Option[] = countries.map((c) => ({ value: c.code, label: c.label }));

const statOptions: Option[] = STAT_TYPES.map((t) => ({ value: t.value, label: t.label }));

const typeOptions: Option[] = [
    { value: "line", label: "Line chart" },
    { value: "bar", label: "Bar chart" },
    { value: "stepped", label: "Stepped line chart" },
    { value: "points", label: "Line chart with point shapes" },
    { value: "pie", label: "Pie chart (months of one year)" },
];

const dataOptions: Option[] = [
    { value: "month", label: "Per month in one year" },
    { value: "compare", label: "Compare two years" },
];

const yearOptions: Option[] = [];
for (let y = TO; y >= FROM; y--) yearOptions.push({ value: String(y), label: String(y) });


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
    const [allCountryFires, setAllCountryFires] = useState<FireDataResponseDto[]>([]);
    const [countryFiresLoading, setCountryFiresLoading] = useState(false);
    const [countryFiresError, setCountryFiresError] = useState<string | null>(null);
    const [country, setCountry] = useState("BGR");
    const [stat, setStat] = useState<StatType>("fires-over-time");
    const [kind, setKind] = useState("bar");
    const [view, setView] = useState("month"); // "month" or "compare"
    const [monthYear, setMonthYear] = useState("2025"); // used when view is "month"
    const [yearA, setYearA] = useState("2024"); // used when view is "compare"
    const [yearB, setYearB] = useState("2025");
    const [types, setTypes] = useState<FireType[]>(["vegetation"]);
    // what the API sent for the "per month in one year" and "compare two years" views,
    // together with the choices it belongs to (so an old answer is never shown for new choices)
    // ("MODIS vs VIIRS" fills instrumentRows instead of rows, "Day vs night" fills dayNight)
    const [apiResult, setApiResult] = useState<{
        key: string;
        rows: MonthlyRow[];
        instrumentRows: InstrumentRow[];
        dayNight: DayNight | null;
        error: string | null;
    } | null>(null);
    // the bar the user clicked: the biggest fires of that month (or year) are listed under the chart
    const [picked, setPicked] = useState<{
        country: string;
        stat: StatType;
        year: number;
        month: number | null;
        instrument: "modis" | "viirs" | null; // the MODIS or VIIRS bar of "MODIS vs VIIRS"
    } | null>(null);
    // the hottest fires the API sent for the clicked bar, together with the choices they belong to
    const [fireResult, setFireResult] = useState<{ key: string; fires: Fire[]; error: string | null } | null>(null);
    const [picked, setPicked] = useState<{
        country: string;
        stat: StatType;
        year: number;
        month: number | null;
        instrument: "modis" | "viirs" | null; // the MODIS or VIIRS bar of "MODIS vs VIIRS"
    } | null>(null);
    // the hottest fires the API sent for the clicked bar, together with the choices they belong to
    const [fireResult, setFireResult] = useState<{ key: string; fires: Fire[]; error: string | null } | null>(null);
    const [openFire, setOpenFire] = useState<string | null>(null); // id of the fire whose details are shown

    // the pie chart always shows the 12 months of one year
    const isPie = kind === "pie";
    // "Number of fires over time", "MODIS vs VIIRS" and "Day vs night" come from the API; the other statistics show one demo chart
    const statType = STAT_TYPES.find((t) => t.value === stat)!;
    const isSatellite = stat === "satellite";
    // "Day vs night" counts all types of fire, so the fire type checkboxes are not used there
    const isDayNight = stat === "day-night";
    const extra =
        stat === "fires-over-time" || isSatellite || isDayNight
            ? null
            : getStatData(stat, country, `${FROM}-01-01`, `${TO}-12-31`);
    const shownView = extra
        ? "stat"
        : isSatellite
          ? "satellite"
          : isDayNight
            ? "daynight"
            : isPie
              ? "month"
              : view;
    // views that show one chosen year
    const oneYear = shownView === "month" || shownView === "satellite" || shownView === "daynight";

    function chooseStat(value: string) {
        const next = STAT_TYPES.find((t) => t.value === value);
        if (!next) return;
        setStat(next.value);
        setKind(next.value === "fires-over-time" ? "bar" : next.chart); // start with the chart that fits this statistic
    }

    const countryName = countries.find((c) => c.code === country)?.label ?? "";
    // the API wants the two-letter code ("BG"), the page keeps the three-letter one ("BGR")
    const countryCode2 = countries.find((c) => c.code === country)?.value;

    // the month, compare, MODIS vs VIIRS and day vs night views get their numbers from the API
    const usesApi = shownView !== "stat" && !!countryCode2 && (isDayNight || types.length > 0);
    const requestKey =
        shownView === "compare"
            ? `compare|${countryCode2}|${yearA}|${yearB}|${types.join(",")}`
            : shownView === "daynight"
              ? `daynight|${countryCode2}|${monthYear}`
              : `${shownView}|${countryCode2}|${monthYear}|${types.join(",")}`;
    const apiDone = apiResult?.key === requestKey;
    const loading = usesApi && !apiDone;
    const apiError = apiDone ? apiResult.error : null;
    const yearRows = apiDone ? apiResult.rows : [];
    const instrumentRows = apiDone ? apiResult.instrumentRows : [];
    const dayNight = apiDone ? apiResult.dayNight : null;

    function toggleType(type: FireType) {
        setTypes(types.includes(type) ? types.filter((t) => t !== type) : [...types, type]);
    }

    
    useEffect(() => {
        if (!countryName) return;

        let cancelled = false;
        setCountryFiresLoading(true);
        setCountryFiresError(null);

        getAllFiresByCountry(countryName)
            .then((data) => {
                if (!cancelled) {
                    setAllCountryFires(data);
                    setCountryFiresLoading(false);
                }
            })
            .catch((err) => {
                console.error(err);
                if (!cancelled) {
                    setCountryFiresError("Could not load country fire records.");
                    setCountryFiresLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [countryName]);

    // ask the API for the chosen year(s); until the answer arrives the page shows the loading animation
    useEffect(() => {
        if (!usesApi || !countryCode2) return;
        let cancelled = false;
        const request: Promise<{ rows: MonthlyRow[]; instrumentRows: InstrumentRow[]; dayNight: DayNight | null }> =
            shownView === "daynight"
                ? getDayNight(countryCode2, Number(monthYear)).then((dayNight) => ({
                      rows: [],
                      instrumentRows: [],
                      dayNight,
                  }))
                : shownView === "satellite"
                  ? getInstruments(countryCode2, Number(monthYear), types).then((instrumentRows) => ({
                        rows: [],
                        instrumentRows,
                        dayNight: null,
                    }))
                  : (shownView === "month"
                        ? getMonthly(countryCode2, Number(monthYear), types)
                        : compareYears(countryCode2, Number(yearA), Number(yearB), types)
                    ).then((rows) => ({ rows, instrumentRows: [], dayNight: null }));
        request
            .then((result) => {
                if (!cancelled) setApiResult({ key: requestKey, ...result, error: null });
            })
            .catch((error: unknown) => {
                console.error(error);
                if (!cancelled) {
                    setApiResult({
                        key: requestKey,
                        rows: [],
                        instrumentRows: [],
                        dayNight: null,
                        error: "The numbers could not be loaded. Is the API running?",
                    });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [usesApi, requestKey, shownView, countryCode2, monthYear, yearA, yearB, types]);

    // the list only belongs to the country it was opened for, and only to the bar chart
    const period =
        picked && picked.country === country && picked.stat === stat && kind === "bar" && !extra ? picked : null;
    const period =
        picked && picked.country === country && picked.stat === stat && kind === "bar" && !extra ? picked : null;
    const periodYear = period?.year;
    const periodMonth = period?.month;
    const periodInstrument = period?.instrument ?? null;

    // the list of the hottest fires comes from the API too
    const firesKey =
        period && countryCode2
            ? `${countryCode2}|${periodYear}|${periodMonth}|${types.join(",")}|${periodInstrument}`
            : null;
    const firesDone = firesKey !== null && fireResult?.key === firesKey;
    const fires = firesDone ? fireResult.fires : [];
    const firesError = firesDone ? fireResult.error : null;
    const firesLoading = firesKey !== null && !firesDone;
    const periodInstrument = period?.instrument ?? null;

    // the list of the hottest fires comes from the API too
    const firesKey =
        period && countryCode2
            ? `${countryCode2}|${periodYear}|${periodMonth}|${types.join(",")}|${periodInstrument}`
            : null;
    const firesDone = firesKey !== null && fireResult?.key === firesKey;
    const fires = firesDone ? fireResult.fires : [];
    const firesError = firesDone ? fireResult.error : null;
    const firesLoading = firesKey !== null && !firesDone;

    useEffect(() => {
        if (firesKey === null || !countryCode2 || periodYear === undefined || periodMonth === undefined) return;
        if (firesKey === null || !countryCode2 || periodYear === undefined || periodMonth === undefined) return;
        let cancelled = false;
        getTopFires(countryCode2, periodYear, periodMonth, types, periodInstrument)
            .then((result) => {
                if (!cancelled) setFireResult({ key: firesKey, fires: result, error: null });
            })
            .catch((error: unknown) => {
                console.error(error);
                if (!cancelled) {
                    setFireResult({ key: firesKey, fires: [], error: "The fires could not be loaded. Is the API running?" });
                }
            });
        getTopFires(countryCode2, periodYear, periodMonth, types, periodInstrument)
            .then((result) => {
                if (!cancelled) setFireResult({ key: firesKey, fires: result, error: null });
            })
            .catch((error: unknown) => {
                console.error(error);
                if (!cancelled) {
                    setFireResult({ key: firesKey, fires: [], error: "The fires could not be loaded. Is the API running?" });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [firesKey, countryCode2, periodYear, periodMonth, types, periodInstrument]);
    }, [firesKey, countryCode2, periodYear, periodMonth, types, periodInstrument]);

    // a click on a bar: which year (and month, and instrument in "MODIS vs VIIRS") does it stand for?
    // a click on a bar: which year (and month, and instrument in "MODIS vs VIIRS") does it stand for?
    function pickBar(index: number, seriesIndex: number) {
        const year = Number(oneYear ? monthYear : seriesIndex === 0 ? yearA : yearB);
        const month = index + 1;
        const instrument = shownView === "satellite" ? (seriesIndex === 0 ? "modis" : "viirs") : null;
        const instrument = shownView === "satellite" ? (seriesIndex === 0 ? "modis" : "viirs") : null;
        setOpenFire(null);
        setPicked({ country, stat, year, month, instrument });
        setPicked({ country, stat, year, month, instrument });
    }

    const typeNames = fireTypes.filter((t) => types.includes(t.value)).map((t) => t.label);

    // the 12 monthly numbers of one year (from the API), or null if that month has no data
    function monthValues(year: string): (number | null)[] {
        return MONTHS.map(
            (_, i) =>
                yearRows.find((r) => r.year === Number(year) && r.month === i + 1)?.hotspots ?? null,
        );
    }

    // the lines for the chart, depending on what the user chose
    let labels: string[];
    let series: Series[];
    let title: string;
    let yTitle: string;
    let sentence = ""; // one sentence that says what the chart shows

    if (extra) {
        labels = extra.points.map((p) => String(p.label));
        const values = extra.points.map((p) => Number(p.value));
        series = [{ name: extra.series[0].name, values }];
        title = `${statType.label} in ${countryName}, ${FROM} to ${TO}`;
        yTitle = statType.unit;

        const e = extremes(labels, values);
        if (e && labels.length > 1) {
            sentence = `The highest value is ${e.most.name} (${fmt(e.most.value)}) and the lowest is ${e.least.name} (${fmt(e.least.value)}).`;
        }
    } else if (shownView === "daynight") {
        // two bars (or pie slices): the hotspots of the year seen by day and by night
        const day = dayNight?.day ?? 0;
        const night = dayNight?.night ?? 0;
        labels = ["Day", "Night"];
        series = [{ name: countryName, values: [day, night] }];
        title = isPie
            ? `Share of day and night detections in ${countryName}, ${monthYear}`
            : `Day vs night detections in ${countryName}, ${monthYear}`;
        yTitle = "Hotspots in the year";

        const total = day + night;
        if (total > 0) {
            const share = Math.round((day / total) * 100);
            sentence = `In ${monthYear}, ${fmt(day)} hotspots (${share}%) were seen by day and ${fmt(night)} (${100 - share}%) by night.`;
        }
    } else if (shownView === "satellite") {
        // one bar (or line) per instrument for each month; the pie shows the share of each instrument in the year
        const modis = MONTHS.map((_, i) => instrumentRows.find((r) => r.month === i + 1)?.modis ?? null);
        const viirs = MONTHS.map((_, i) => instrumentRows.find((r) => r.month === i + 1)?.viirs ?? null);
        const totalModis = modis.reduce<number>((s, v) => s + (v ?? 0), 0);
        const totalViirs = viirs.reduce<number>((s, v) => s + (v ?? 0), 0);
        if (isPie) {
            labels = ["MODIS", "VIIRS"];
            series = [{ name: countryName, values: [totalModis, totalViirs] }];
            title = `Share of MODIS and VIIRS detections in ${countryName}, ${monthYear}`;
        } else {
            labels = MONTHS;
            series = [
                { name: "MODIS", values: modis },
                { name: "VIIRS", values: viirs },
            ];
            title = `MODIS vs VIIRS hotspots per month in ${countryName}, ${monthYear}`;
        }
        yTitle = "Hotspots per month";

        const total = totalModis + totalViirs;
        if (total > 0) {
            const share = Math.round((totalViirs / total) * 100);
            sentence = `In ${monthYear}, VIIRS detected ${fmt(totalViirs)} hotspots (${share}%) and MODIS ${fmt(totalModis)} (${100 - share}%).`;
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
        const firstColumn =
            shownView === "stat"
                ? "Label"
                : shownView === "daynight"
                  ? "Time of day"
                  : isSatellite && isPie
                    ? "Instrument"
                    : "Month";
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
    const sum = (values: (number | null)[]) => values.reduce<number>((s, v) => s + (v ?? 0), 0);
    if (shownView === "compare" && apiDone && !apiError) {
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

    // in the month view, the key numbers are about the chosen year
    let monthGlance: {
        total: number;
        busiest: { name: string; value: number };
        quietest: { name: string; value: number };
        average: number;
    } | null = null;
    if (shownView === "month" && apiDone && !apiError) {
        const total = sum(series[0].values);
        const e = extremes(FULL_MONTHS, series[0].values);
        if (e) monthGlance = { total, busiest: e.most, quietest: e.least, average: Math.round(total / 12) };
    }

    // in the MODIS vs VIIRS view, the key numbers compare the two instruments in the chosen year
    let satelliteGlance: { modis: number; viirs: number; viirsShare: number | null; busiest: string } | null = null;
    if (shownView === "satellite" && apiDone && !apiError) {
        const modis = instrumentRows.reduce((s, r) => s + r.modis, 0);
        const viirs = instrumentRows.reduce((s, r) => s + r.viirs, 0);
        const both = instrumentRows.map((r) => r.modis + r.viirs);
        satelliteGlance = {
            modis,
            viirs,
            viirsShare: modis + viirs > 0 ? Math.round((viirs / (modis + viirs)) * 100) : null,
            busiest: extremes(FULL_MONTHS, both)?.most.name ?? "n/a",
        };
    }

    // in the day vs night view, the key numbers compare day and night in the chosen year
    let dayNightGlance: { day: number; night: number; nightShare: number | null; total: number } | null = null;
    if (shownView === "daynight" && apiDone && !apiError && dayNight) {
        const total = dayNight.day + dayNight.night;
        dayNightGlance = {
            day: dayNight.day,
            night: dayNight.night,
            nightShare: total > 0 ? Math.round((dayNight.night / total) * 100) : null,
            total,
        };
    }

    const noTypes = !extra && !isDayNight && types.length === 0;
    // the day vs night bars stand for a whole year, so they do not open the list of the hottest fires
    const barsClickable = !extra && !isDayNight;
    const marksHighest = !isPie && series.length === 1;

    return (
        <>
            <section className="page-hero">
                <div className="page-hero-inner">
                    <h2>Statistics</h2>
                    <p>
                        Choose a country and a type of fire to see how many hotspots the
                        satellites counted month by month, in one year or two years side by side.
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

                        <div className="field">
                            <label htmlFor="stat">Statistic</label>
                            <Combobox id="stat" options={statOptions} value={stat} onChange={chooseStat} />
                        </div>

                        {!extra && !isPie && !isSatellite && !isDayNight && (
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

                        {oneYear && (
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

                    {!extra && !isDayNight && (
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
                    )}
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

                        {satelliteGlance && (
                            <section aria-label={`Key numbers for ${countryName}`}>
                                <h3 className="key-title">
                                    {countryName} at a glance, {monthYear}
                                </h3>
                                <div className="key-numbers">
                                    <div className="key-number">
                                        <p className="big">{fmt(satelliteGlance.modis)}</p>
                                        <p className="small">hotspots seen by MODIS</p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">{fmt(satelliteGlance.viirs)}</p>
                                        <p className="small">hotspots seen by VIIRS</p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">
                                            {satelliteGlance.viirsShare === null ? "n/a" : `${satelliteGlance.viirsShare}%`}
                                        </p>
                                        <p className="small">of all detections came from VIIRS</p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">{satelliteGlance.busiest}</p>
                                        <p className="small">the busiest month (both instruments)</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {dayNightGlance && (
                            <section aria-label={`Key numbers for ${countryName}`}>
                                <h3 className="key-title">
                                    {countryName} at a glance, {monthYear}
                                </h3>
                                <div className="key-numbers">
                                    <div className="key-number">
                                        <p className="big">{fmt(dayNightGlance.day)}</p>
                                        <p className="small">hotspots seen by day</p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">{fmt(dayNightGlance.night)}</p>
                                        <p className="small">hotspots seen by night</p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">
                                            {dayNightGlance.nightShare === null ? "n/a" : `${dayNightGlance.nightShare}%`}
                                        </p>
                                        <p className="small">of all detections were at night</p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">{fmt(dayNightGlance.total)}</p>
                                        <p className="small">hotspots in {monthYear}</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {monthGlance && (
                            <section aria-label={`Key numbers for ${countryName}`}>
                                <h3 className="key-title">
                                    {countryName} at a glance, {monthYear}
                                </h3>
                                <div className="key-numbers">
                                    <div className="key-number">
                                        <p className="big">{fmt(monthGlance.total)}</p>
                                        <p className="small">hotspots in {monthYear}</p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">{monthGlance.busiest.name}</p>
                                        <p className="small">
                                            the busiest month, with {fmt(monthGlance.busiest.value)} hotspots
                                        </p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">{monthGlance.quietest.name}</p>
                                        <p className="small">
                                            the quietest month, with {fmt(monthGlance.quietest.value)} hotspots
                                        </p>
                                    </div>
                                    <div className="key-number">
                                        <p className="big">{fmt(monthGlance.average)}</p>
                                        <p className="small">hotspots in an average month</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        <div className={period ? "stats-split has-list" : "stats-split"}>
                        <div className="stats-result">
                            <h3>{title}</h3>
                            {sentence && <p className="sentence">{sentence}</p>}
                            <p className="counted">
                                {extra ? (
                                    "Demo numbers, all types of fire."
                                ) : isDayNight ? (
                                    <>
                                        Counted: <strong>all types of fire</strong>.
                                    </>
                                ) : (
                                    <>
                                        Counted: <strong>{typeNames.join(", ").toLowerCase()}</strong>.
                                    </>
                                )}
                            </p>
                            {kind === "bar" && barsClickable && (
                                <p className="chart-hint">
                                    Click a bar to open the detailed stats of that month.
                                </p>
                            )}

                            {loading ? (
                                <div className="stats-chart stats-loading" role="status">
                                    <span className="spinner" aria-hidden="true" />
                                    <p>Counting the hotspots…</p>
                                </div>
                            ) : apiError ? (
                                <div className="stats-chart stats-loading" role="alert">
                                    <p>{apiError}</p>
                                </div>
                            ) : (
                                <div
                                    className="stats-chart"
                                    key={`${kind}-${shownView}-${stat}-${country}-${types.join("")}`}
                                >
                                    <StatsChart
                                        kind={kind as ChartKind}
                                        labels={labels}
                                        series={series}
                                        yTitle={yTitle}
                                        onBarClick={barsClickable ? pickBar : undefined}
                                    />
                                </div>
                            )}

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

                        {period && (
                            <DetailedStats
                                title={`Detailed stats: ${fires.length || 25} hottest ${period.instrument ? period.instrument.toUpperCase() + " " : ""}fires in ${countryName}, ${period.month ? FULL_MONTHS[period.month - 1] + " " : ""}${period.year}`}
                                title={`Detailed stats: ${fires.length || 25} hottest ${period.instrument ? period.instrument.toUpperCase() + " " : ""}fires in ${countryName}, ${period.month ? FULL_MONTHS[period.month - 1] + " " : ""}${period.year}`}
                                fires={fires}
                                loading={firesLoading}
                                error={firesError}
                                loading={firesLoading}
                                error={firesError}
                                openId={openFire}
                                onOpen={setOpenFire}
                                onClose={() => setPicked(null)}
                            />
                        )}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

// 1558 becomes "15:58"
function formatTime(hhmm: number): string {
    const text = String(hhmm).padStart(4, "0");
    return `${text.slice(0, 2)}:${text.slice(2)}`;
}

// the map page puts a pin on exactly these coordinates (see MapPage: /map?lat=..&lon=..)
function mapLink(f: Fire): string {
    const params = new URLSearchParams({
        lat: String(f.latitude),
        lon: String(f.longitude),
        date: `${f.acq_date} ${formatTime(f.acq_time)} UTC`,
    });
    if (f.temperature !== null) params.set("temp", String(f.temperature));
    return `/map?${params}`;
}

// the map page puts a pin on exactly these coordinates (see MapPage: /map?lat=..&lon=..)
function mapLink(f: Fire): string {
    const params = new URLSearchParams({
        lat: String(f.latitude),
        lon: String(f.longitude),
        date: `${f.acq_date} ${formatTime(f.acq_time)} UTC`,
    });
    if (f.temperature !== null) params.set("temp", String(f.temperature));
    return `/map?${params}`;
}

interface DetailedStatsProps {
    title: string;
    fires: Fire[];
    loading: boolean;
    error: string | null;
    loading: boolean;
    error: string | null;
    openId: string | null;
    onOpen: (id: string | null) => void;
    onClose: () => void;
}

// the "detailed stats" list of the biggest fires; after a click on the coordinates only that fire stays, with more details
function DetailedStats({ title, fires, loading, error, openId, onOpen, onClose }: DetailedStatsProps) {
function DetailedStats({ title, fires, loading, error, openId, onOpen, onClose }: DetailedStatsProps) {
    const open = fires.find((f) => f.id === openId) ?? null;
    const shown = open ? [open] : fires;
    const coords = (f: Fire) => `${f.latitude.toFixed(3)}, ${f.longitude.toFixed(3)}`;

    return (
        <section className="fire-list" aria-label={title}>
            <div className="fire-list-head">
                <h3>{title}</h3>
                <div className="buttons">
                    {open && (
                        <button type="button" className="button" onClick={() => onOpen(null)}>
                            Show the whole list
                        </button>
                    )}
                    <button type="button" className="button" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
            {loading ? (
                <div className="stats-loading" role="status">
                    <span className="spinner" aria-hidden="true" />
                    <p>Finding the hottest fires…</p>
                </div>
            ) : error ? (
                <p className="counted" role="alert">{error}</p>
            ) : fires.length === 0 ? (
            {loading ? (
                <div className="stats-loading" role="status">
                    <span className="spinner" aria-hidden="true" />
                    <p>Finding the hottest fires…</p>
                </div>
            ) : error ? (
                <p className="counted" role="alert">{error}</p>
            ) : fires.length === 0 ? (
                <p className="counted">No fires to show.</p>
            ) : (
                <>
                    <table className="fire-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Date</th>
                                <th>Coordinates (click for details)</th>
                                <th>Temperature (K)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shown.map((f) => (
                                <tr key={f.id} className={f.id === openId ? "open" : ""}>
                                    <td>{fires.indexOf(f) + 1}</td>
                                    <td>{f.acq_date}</td>
                                    <td>
                                        <button type="button" className="coords" onClick={() => onOpen(f.id)}>
                                            {coords(f)}
                                        </button>
                                    </td>
                                    <td>{f.temperature ?? "n/a"}</td>
                                    <td>{f.temperature ?? "n/a"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {open && (
                        <dl className="fire-details">
                            <div><dt>Date (acq_date)</dt><dd>{open.acq_date}</dd></div>
                            <div><dt>Time, UTC (acq_time)</dt><dd>{formatTime(open.acq_time)}</dd></div>
                            <div><dt>Latitude</dt><dd>{open.latitude}</dd></div>
                            <div><dt>Longitude</dt><dd>{open.longitude}</dd></div>
                            {open.brightness !== null && (
                                <div><dt>Brightness</dt><dd>{open.brightness} K</dd></div>
                            )}
                            {open.bright_t31 !== null && (
                                <div><dt>Brightness, channel 31 (bright_t31)</dt><dd>{open.bright_t31} K</dd></div>
                            )}
                            {open.bright_ti4 !== null && (
                                <div><dt>Brightness, channel I-4 (bright_ti4)</dt><dd>{open.bright_ti4} K</dd></div>
                            )}
                            {open.bright_ti5 !== null && (
                                <div><dt>Brightness, channel I-5 (bright_ti5)</dt><dd>{open.bright_ti5} K</dd></div>
                            )}
                            {open.brightness !== null && (
                                <div><dt>Brightness</dt><dd>{open.brightness} K</dd></div>
                            )}
                            {open.bright_t31 !== null && (
                                <div><dt>Brightness, channel 31 (bright_t31)</dt><dd>{open.bright_t31} K</dd></div>
                            )}
                            {open.bright_ti4 !== null && (
                                <div><dt>Brightness, channel I-4 (bright_ti4)</dt><dd>{open.bright_ti4} K</dd></div>
                            )}
                            {open.bright_ti5 !== null && (
                                <div><dt>Brightness, channel I-5 (bright_ti5)</dt><dd>{open.bright_ti5} K</dd></div>
                            )}
                            <div><dt>Fire power (frp)</dt><dd>{fmt(open.frp)} MW</dd></div>
                            <div><dt>Pixel size (scan x track)</dt><dd>{open.scan} x {open.track} km</dd></div>
                            <div><dt>Confidence</dt><dd>{open.confidence}</dd></div>
                            <div><dt>Confidence</dt><dd>{open.confidence}</dd></div>
                            <div><dt>Satellite</dt><dd>{open.satellite}</dd></div>
                            <div><dt>Instrument</dt><dd>{open.instrument}</dd></div>
                            <div><dt>Seen in the</dt><dd>{open.daynight === "D" ? "Day" : "Night"}</dd></div>
                            <div><dt>Type of fire</dt><dd>{fireTypes.find((t) => t.firmsType === open.type)?.label ?? "Unknown"}</dd></div>
                            <div>
                                <dt>Map</dt>
                                <dd>
                                    <Link
                                        to={mapLink(open)}
                                        to={mapLink(open)}
                                    >
                                        Show on the map
                                    </Link>
                                </dd>
                            </div>
                        </dl>
                    )}
                </>
            )}
        </section>
    );
}

export default Statistics;