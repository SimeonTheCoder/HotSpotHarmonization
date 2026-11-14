interface FilterDropdownProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
}

function FilterDropdown({ options, value, onChange }: FilterDropdownProps) {
    return (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((option) => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
        </select>
    );
}

export default FilterDropdown;
