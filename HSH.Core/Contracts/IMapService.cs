using HSH.Core.DTOs;

namespace HSH.Core.Services.Contracts;

public interface IMapService
{
    public Task<CoordinatesResponseDTO[]> GetCountryFiresForPeriodOfTime(string countryCode, DateOnly start, DateOnly end);
}
