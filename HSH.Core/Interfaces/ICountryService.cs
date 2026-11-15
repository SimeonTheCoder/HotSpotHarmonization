using System.Collections.Generic;
using System.Threading.Tasks;
using HSH.Core.DTOs;
using HSH.Data.Data.Models;


namespace HSH.Core.Interfaces
{
    public interface ICountryService
    {
        Task<IEnumerable<Country>> GetAllCountriesAsync();
        Task<CountryByIdDto?> GetCountryByIdAsync(int id);
        Task<List<CountryByNameDTO>> GetCountryByNameAsync(string name);
        Task<IEnumerable<CountryFireSummaryDto>> GetGlobalFireSummaryAsync();
    }
}