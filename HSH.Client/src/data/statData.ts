export type StatType =
    | "fires-over-time"
    | "frp-over-time"
    | "day-night"
    | "confidence"
    | "satellite"
    | "seasonality";

export interface StatTypeOption {
    value: StatType;
    label: string;
    chart: "line" | "bar";
    unit: string;
}

export const STAT_TYPES: StatTypeOption[] = [
    { value: "fires-over-time", label: "Number of fires over time", chart: "line", unit: "detections" },
    { value: "frp-over-time", label: "Fire intensity (FRP) over time", chart: "line", unit: "MW" },
    { value: "seasonality", label: "Fires by month (seasonality)", chart: "bar", unit: "detections" },
    { value: "day-night", label: "Day vs night detections", chart: "bar", unit: "detections" },
    { value: "confidence", label: "Detection confidence", chart: "bar", unit: "detections" },
    { value: "satellite", label: "MODIS vs VIIRS", chart: "bar", unit: "detections" },
];

export interface SeriesInfo {
    key: string;
    name: string;
    color: string;
}

export interface StatResult {
    points: Record<string, string | number>[];
    series: SeriesInfo[];
}

function hash(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function rng(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const seasonFactor = (month: number) =>
    0.3 + 1.2 * Math.exp(-Math.pow((month - 7) / 2.2, 2));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function getStatData(
    type: StatType,
    countryCode: string | undefined,
    start: string,
    end: string
): StatResult {
    const country = countryCode ?? "ALL";
    const countryScale = 20 + (hash(country) % 180) * (country === "ALL" ? 8 : 1);
    const rand = rng(hash(`${country}|${type}|${start}|${end}`));

    const startD = new Date(start);
    const endD = new Date(end);
    const days = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1;

    const daily: { date: Date; count: number }[] = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(startD);
        d.setDate(d.getDate() + i);
        const count = Math.round(
            countryScale * seasonFactor(d.getMonth() + 1) * (0.6 + rand() * 0.8)
        );
        daily.push({ date: d, count });
    }
    const total = daily.reduce((s, d) => s + d.count, 0);

    if (type === "fires-over-time" || type === "frp-over-time") {
        const byMonth = days > 60;
        const buckets = new Map<string, number>();
        for (const { date, count } of daily) {
            const key = byMonth
                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
                : date.toISOString().slice(0, 10);
            buckets.set(key, (buckets.get(key) ?? 0) + count);
        }
        const factor = type === "frp-over-time" ? 14 : 1;
        const name = type === "frp-over-time" ? "Total FRP" : "Fires";
        return {
            points: [...buckets].map(([label, v]) => ({
                label,
                value: Math.round(v * factor * (0.9 + rand() * 0.2)),
            })),
            series: [{ key: "value", name, color: "#FF8A00" }],
        };
    }

    if (type === "seasonality") {
        const perMonth = new Array(12).fill(0);
        for (const { date, count } of daily) perMonth[date.getMonth()] += count;
        return {
            points: MONTHS.map((label, i) => ({ label, value: perMonth[i] })),
            series: [{ key: "value", name: "Fires", color: "#E8403A" }],
        };
    }

    const split = (parts: [string, number][]) =>
        parts.map(([label, share]) => ({
            label,
            value: Math.round(total * share * (0.9 + rand() * 0.2)),
        }));

    if (type === "day-night") {
        return {
            points: split([["Day", 0.7], ["Night", 0.3]]),
            series: [{ key: "value", name: "Detections", color: "#5A0B3A" }],
        };
    }
    if (type === "confidence") {
        return {
            points: split([["Low", 0.15], ["Nominal", 0.5], ["High", 0.35]]),
            series: [{ key: "value", name: "Detections", color: "#FF8A00" }],
        };
    }
    return {
        points: split([["MODIS", 0.35], ["VIIRS", 0.65]]),
        series: [{ key: "value", name: "Detections", color: "#E8403A" }],
    };
}