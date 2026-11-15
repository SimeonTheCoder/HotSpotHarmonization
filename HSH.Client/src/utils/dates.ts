export const MIN_DATE = "2001-01-01";

export const toISO = (d: Date) => d.toISOString().slice(0, 10);
export const today = () => toISO(new Date());

// Adds (or subtracts) months to "YYYY-MM-DD". Jan 31 + 1 month gives Feb 28/29, not Mar 3.
export function addMonths(iso: string, months: number): string {
    const [y, m, d] = iso.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
    const date = new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay)));
    return toISO(date);
}