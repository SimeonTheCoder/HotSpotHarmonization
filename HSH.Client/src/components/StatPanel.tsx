import { useMemo, useState } from "react";
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import CountryDropdown from "./CountryFilter";
import type { CountryOption } from "../data/countries";
import { getStatData } from "../data/statData";
import type { StatTypeOption } from "../data/statData";

// Chart.js only includes what you register
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Tooltip,
    Legend
);

interface StatPanelProps {
    title: string;
    statType: StatTypeOption;
}

const toISO = (d: Date) => d.toISOString().slice(0, 10);

function defaultRange() {
    const end = new Date();
    const start = new Date();
    start.setFullYear(end.getFullYear() - 1);
    return { start: toISO(start), end: toISO(end) };
}

const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: "top" as const },
    },
    scales: {
        x: { ticks: { maxTicksLimit: 12 } },
        y: { beginAtZero: true },
    },
};

function StatPanel({ title, statType }: StatPanelProps) {
    const [country, setCountry] = useState<CountryOption | null>(null);
    const [start, setStart] = useState(() => defaultRange().start);
    const [end, setEnd] = useState(() => defaultRange().end);

    const invalid = !start || !end || start > end;

    const result = useMemo(
        () =>
            invalid
                ? null
                : getStatData(statType.value, country?.code, start, end),
        [statType, country, start, end, invalid]
    );

    const lineData = useMemo(() => {
        if (!result) return null;
        return {
            labels: result.points.map((p) => String(p.label)),
            datasets: result.series.map((s) => ({
                label: `${s.name} (${statType.unit})`,
                data: result.points.map((p) => Number(p[s.key])),
                borderColor: s.color,
                backgroundColor: s.color,
                borderWidth: 3,
                pointRadius: 0,
                pointHitRadius: 10,
                tension: 0.3,
            })),
        };
    }, [result, statType]);

    const barData = useMemo(() => {
        if (!result) return null;
        return {
            labels: result.points.map((p) => String(p.label)),
            datasets: result.series.map((s) => ({
                label: `${s.name} (${statType.unit})`,
                data: result.points.map((p) => Number(p[s.key])),
                backgroundColor: s.color,
                borderRadius: 6,
            })),
        };
    }, [result, statType]);

    return (
        <section className="stat-panel">
            <h3 className="stat-panel-title">{title}</h3>

            <div className="stat-inputs">
                <div className="stat-field">
                    <label>Country</label>
                    <CountryDropdown onChange={setCountry} />
                </div>
                <div className="stat-field">
                    <label>Start date</label>
                    <input
                        type="date"
                        value={start}
                        max={end || undefined}
                        onChange={(e) => setStart(e.target.value)}
                    />
                </div>
                <div className="stat-field">
                    <label>End date</label>
                    <input
                        type="date"
                        value={end}
                        min={start || undefined}
                        onChange={(e) => setEnd(e.target.value)}
                    />
                </div>
            </div>

            <p className="stat-subtitle">
                {statType.label} · {country?.label ?? "All countries"}
            </p>

            <div className="stat-chart">
                {!result ? (
                    <p className="stat-error">
                        Pick a valid date range (start must be before end).
                    </p>
                ) : statType.chart === "line" ? (
                    <Line data={lineData!} options={options} />
                ) : (
                    <Bar data={barData!} options={options} />
                )}
            </div>
        </section>
    );
}

export default StatPanel;