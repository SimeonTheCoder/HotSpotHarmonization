import { useRef, useState } from "react";

export interface Option {
    value: string;
    label: string;
}

interface ComboboxProps {
    id: string;
    options: Option[];
    value: string; // the value of the chosen option
    onChange: (value: string) => void;
    placeholder?: string;
    // an option that is hidden from the list; typing it shows the message as an error
    blocked?: { label: string; message: string };
}

// a textbox with a list under it: type to filter, click one option to choose it
function Combobox({ id, options, value, onChange, placeholder, blocked }: ComboboxProps) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0); // the row marked with the arrow keys
    const inputRef = useRef<HTMLInputElement>(null);

    const chosen = options.find((o) => o.value === value);
    const shown = options.filter((o) =>
        o.label.toLowerCase().includes(query.trim().toLowerCase()),
    );

    // true when the user typed exactly the blocked option
    const typedBlocked =
        blocked !== undefined && query.trim().toLowerCase() === blocked.label.toLowerCase();

    // the text that is in the box right now
    const text = open ? query : (chosen?.label ?? "");

    function clear() {
        setQuery("");
        setActive(0);
        setOpen(true);
        inputRef.current?.focus();
    }

    function choose(option: Option) {
        onChange(option.value);
        setOpen(false);
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive(Math.min(active + 1, shown.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(Math.max(active - 1, 0));
        } else if (e.key === "Enter" && open && shown[active]) {
            e.preventDefault();
            choose(shown[active]);
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    }

    return (
        <div className="combo">
            <input
                ref={inputRef}
                id={id}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={id + "-list"}
                aria-autocomplete="list"
                placeholder={placeholder}
                // while the list is open you see what you type, otherwise the chosen option
                value={text}
                onFocus={() => {
                    setQuery("");
                    setActive(0);
                    setOpen(true);
                }}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                    setOpen(true);
                }}
                onBlur={() => setOpen(false)}
                onKeyDown={onKeyDown}
            />

            {text !== "" && (
                <button
                    type="button"
                    className="combo-clear"
                    aria-label="Clear the text"
                    // mouse down would take the focus away from the box, so we stop it
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={clear}
                >
                    ×
                </button>
            )}

            {open && (
                <ul id={id + "-list"} className="combo-list" role="listbox">
                    {shown.map((o, i) => (
                        <li
                            key={o.value}
                            role="option"
                            aria-selected={o.value === value}
                            className={
                                (o.value === value ? "chosen " : "") + (i === active ? "active" : "")
                            }
                            // mouse down happens before the input loses focus, so the click still works
                            onMouseDown={(e) => {
                                e.preventDefault();
                                choose(o);
                            }}
                        >
                            {o.label}
                        </li>
                    ))}
                    {typedBlocked && (
                        <li className="error" role="alert">
                            {blocked.message}
                        </li>
                    )}
                    {shown.length === 0 && !typedBlocked && <li className="none">Nothing found.</li>}
                </ul>
            )}
        </div>
    );
}

export default Combobox;
