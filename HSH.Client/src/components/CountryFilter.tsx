import countries from "../data/countries";
import type { CountryOption } from "../data/countries";

interface CountryDropdownProps {
    onChange: (country: CountryOption | null) => void;
}

function CountryDropdown({ onChange }: CountryDropdownProps) {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected =
            countries.find((c) => c.value === e.target.value) ?? null;
        onChange(selected);
    };

    return (
        <select defaultValue="" onChange={handleChange}>
            <option value="">Select a country</option>
            {countries.map((c) => (
                <option key={c.value} value={c.value}>
                    {c.label}
                </option>
            ))}
        </select>
    );
}

export default CountryDropdown;