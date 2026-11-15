using System.Collections.Generic;
using System.Threading.Tasks;
using HSH.Core.DTOs;
using HSH.Data.Enums;

namespace HSH.Core.Interfaces
{
    public interface IFireService
    {

        Task<IEnumerable<FireDataResponseDto>> GetTop25HottestFiresByCountryAsync(
                    string countryName, 
                    DateTime startDate, 
                    DateTime endDate, 
                    FireType? fireType = null);
                

    }
}