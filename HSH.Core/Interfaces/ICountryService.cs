using System.Collections.Generic;
using System.Threading.Tasks;
using HSH.Data.Data.Models;
using HSH.Core.DTOs;

namespace HSH.Core.Interfaces
{
    public interface ICountryService
    {
        Task<IEnumerable<Country>> GetAllCountriesAsync();
        Task<Country?> GetCountryByIdAsync(int id);
        Task<List<CountryByNameDTO>> GetCountryByNameAsync(string name);
        Task<IEnumerable<CountryFireSummaryDto>> GetGlobalFireSummaryAsync();
    }
}