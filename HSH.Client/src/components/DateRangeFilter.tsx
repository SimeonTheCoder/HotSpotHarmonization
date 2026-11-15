import { useEffect, useState } from "react";
import { MIN_DATE, addMonths, today } from "../utils/dates";

interface DateRangeFilterProps {
    start: string;
    end: string;
    onChange: (start: string, end: string) => void;
}

function DateRangeFilter({ start, end, onChange }: DateRangeFilterProps) {
    const max = today();
    const [draftStart, setDraftStart] = useState(start);
    const [draftEnd, setDraftEnd] = useState(end);

    // when the range is adjusted from outside (the other date moved), show it
    useEffect(() => {
        setDraftStart(start);
        setDraftEnd(end);
    }, [start, end]);

    const isValid = (v: string) =>
        /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= MIN_DATE && v <= max;

    const changeStart = (value: string) => {
        setDraftStart(value);
        if (!isValid(value)) return;

        let newEnd = end;
        if (newEnd < value) newEnd = value;
        const limit = addMonths(value, 1);
        if (newEnd > limit) newEnd = limit > max ? max : limit;
        onChange(value, newEnd);
    };

    const changeEnd = (value: string) => {
        setDraftEnd(value);
        if (!isValid(value)) return;

        let newStart = start;
        if (newStart > value) newStart = value;
        const limit = addMonths(value, -1);
        if (newStart < limit) newStart = limit < MIN_DATE ? MIN_DATE : limit;
        onChange(newStart, value);
    };

    return (
        <>
            <div className="map-field">
                <label>Start date</label>
                <input
                    type="date"
                    value={draftStart}
                    min={MIN_DATE}
                    max={max}
                    onChange={(e) => changeStart(e.target.value)}
                    onBlur={() => setDraftStart(start)}
                />
            </div>
            <div className="map-field">
                <label>End date</label>
                <input
                    type="date"
                    value={draftEnd}
                    min={MIN_DATE}
                    max={max}
                    onChange={(e) => changeEnd(e.target.value)}
                    onBlur={() => setDraftEnd(end)}
                />
            </div>
        </>
    );
}

export default DateRangeFilter;