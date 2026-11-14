import Select from "react-select";
import countries, { type CountryOption } from "../data/countries";

interface CountryDropdownProps {
    onChange: (country: CountryOption | null) => void;
}

function CountryDropdown({ onChange }: CountryDropdownProps) {
    return (
        <Select
            options={countries}
            isSearchable
            placeholder="Select a country..."
            onChange={onChange}
            className="country-dropdown"
            menuPortalTarget={document.body}
            styles={{
                container: (base) => ({
                    ...base,
                    width: "250px"
                }),
                menuPortal: (base) => ({
                    ...base,
                    zIndex: 9999
                })
            }}
        />
    );
}

export default CountryDropdown;