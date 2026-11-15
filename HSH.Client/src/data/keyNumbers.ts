import type { MonthlyRow } from "./mockData";

export interface KeyNumbers {
    total: number;
    worstYear: { year: number; hotspots: number };
    peakMonth: number; // 1 to 12, the month that is busiest on average
    averagePerYear: number;
}

// the key numbers of one country, worked out from its monthly rows
export function getKeyNumbers(rows: MonthlyRow[]): KeyNumbers | null {
    if (rows.length === 0) return null;

    // add up every year
    const yearTotals = new Map<number, number>();
    let total = 0;
    for (const r of rows) {
        yearTotals.set(r.year, (yearTotals.get(r.year) ?? 0) + r.hotspots);
        total += r.hotspots;
    }
    let worstYear = { year: 0, hotspots: -1 };
    for (const [year, hotspots] of yearTotals) {
        if (hotspots > worstYear.hotspots) worstYear = { year, hotspots };
    }

    // the month with the highest average over all years
    let peakMonth = 1;
    let peakAverage = -1;
    for (let month = 1; month <= 12; month++) {
        const values = rows.filter((r) => r.month === month).map((r) => r.hotspots);
        if (values.length === 0) continue;
        const average = values.reduce((sum, v) => sum + v, 0) / values.length;
        if (average > peakAverage) {
            peakAverage = average;
            peakMonth = month;
        }
    }

    return {
        total,
        worstYear,
        peakMonth,
        averagePerYear: Math.round(total / yearTotals.size),
    };
}
