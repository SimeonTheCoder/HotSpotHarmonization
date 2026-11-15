import {
    Chart as ChartJS,
    ArcElement,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    type Plugin,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(
    ArcElement,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
);
ChartJS.defaults.font.family = '"IBM Plex Sans", Arial, sans-serif';
ChartJS.defaults.font.size = 14;
ChartJS.defaults.color = "#1E0932";

export type ChartKind = "bar" | "line" | "stepped" | "points" | "pie";

export interface Series {
    name: string;
    values: (number | null)[]; // null = no data for that label
}

interface StatsChartProps {
    kind: ChartKind;
    labels: string[];
    series: Series[];
    yTitle: string;
}

// one colour for each line: dark purple, then red
const COLORS = ["#1E0932", "#E8403A", "#FF8A00"];

// the highest value of a single line is shown in red
const HIGHLIGHT = "#E8403A";
const HIGHLIGHT_TEXT = "#C42B2B";

// the marker shape of each line, used by the "point shapes" chart
const SHAPES = ["rectRot", "triangle", "circle"] as const;

// the position of the highest value, or -1 if there is none
function peakIndex(values: (number | null)[]): number {
    let best = -1;
    values.forEach((v, i) => {
        if (v !== null && (best === -1 || v > (values[best] ?? 0))) best = i;
    });
    return best;
}

// writes "highest" next to the highest point or bar (only when there is one line)
const peakLabel: Plugin = {
    id: "peakLabel",
    afterDatasetsDraw(chart) {
        if (chart.data.datasets.length !== 1) return;
        const values = chart.data.datasets[0].data as (number | null)[];
        const index = peakIndex(values);
        if (index === -1) return;

        const element = chart.getDatasetMeta(0).data[index];
        const text = `${chart.data.labels?.[index]}: highest`;
        const { ctx, chartArea } = chart;

        ctx.save();
        ctx.font = `600 14px ${ChartJS.defaults.font.family}`;
        ctx.fillStyle = HIGHLIGHT_TEXT;
        // keep the text inside the chart when the peak is near the left or right edge
        const width = ctx.measureText(text).width;
        const x = Math.min(Math.max(element.x, chartArea.left + width / 2), chartArea.right - width / 2);
        ctx.textAlign = "center";
        ctx.fillText(text, x, element.y - 12);
        ctx.restore();
    },
};

// pie slices go from pale (few hotspots) to dark (many hotspots)
function sliceColor(value: number, min: number, max: number): string {
    const t = max === min ? 1 : (value - min) / (max - min);
    const pale = [255, 233, 168];
    const dark = [90, 11, 58];
    const rgb = pale.map((p, i) => Math.round(p + (dark[i] - p) * t));
    return `rgb(${rgb.join(",")})`;
}

function StatsChart({ kind, labels, series, yTitle }: StatsChartProps) {
    if (kind === "pie") {
        const values = (series[0]?.values ?? []).map((v) => v ?? 0);
        const total = values.reduce((sum, v) => sum + v, 0);
        const min = Math.min(...values);
        const max = Math.max(...values);

        const data = {
            labels,
            datasets: [
                {
                    data: values,
                    backgroundColor: values.map((v) => sliceColor(v, min, max)),
                    borderColor: "#fff",
                    borderWidth: 2,
                },
            ],
        };
        const pieOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "right" as const },
                tooltip: {
                    callbacks: {
                        label: (ctx: { label: string; parsed: number }) =>
                            `${ctx.label}: ${ctx.parsed.toLocaleString()} hotspots (${Math.round((ctx.parsed / total) * 100)}%)`,
                    },
                },
            },
        };
        return <Pie data={data} options={pieOptions} />;
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 24 } }, // room for the "highest" text
        interaction: { intersect: false, axis: "x" as const },
        plugins: {
            legend: {
                position: "top" as const,
                labels: { usePointStyle: kind === "points" },
            },
        },
        scales: {
            x: { grid: { display: false } },
            y: {
                beginAtZero: true,
                grid: { color: "rgba(30, 9, 50, 0.1)" },
                title: { display: true, text: yTitle },
            },
        },
    };

    // with one line we can mark its highest value
    const peak = series.length === 1 ? peakIndex(series[0].values) : -1;

    if (kind === "bar") {
        const data = {
            labels,
            datasets: series.map((s, i) => ({
                label: s.name,
                data: s.values,
                backgroundColor: s.values.map((_, index) => (index === peak ? HIGHLIGHT : COLORS[i])),
                borderRadius: 4,
                borderSkipped: false as const,
            })),
        };
        return <Bar data={data} options={options} plugins={[peakLabel]} />;
    }

    // many labels (years) get no dots, only the highest point is shown
    const baseRadius = kind === "points" ? 6 : labels.length > 12 ? 0 : 3;
    const data = {
        labels,
        datasets: series.map((s, i) => ({
            label: s.name,
            data: s.values,
            borderColor: COLORS[i],
            backgroundColor: COLORS[i],
            pointBackgroundColor: s.values.map((_, index) => (index === peak ? HIGHLIGHT : COLORS[i])),
            pointRadius: s.values.map((_, index) => (index === peak ? baseRadius + 4 : baseRadius)),
            pointHoverRadius: 7,
            pointStyle: kind === "points" ? SHAPES[i] : "circle",
            stepped: kind === "stepped",
        })),
    };
    return <Line data={data} options={options} plugins={[peakLabel]} />;
}

export default StatsChart;
