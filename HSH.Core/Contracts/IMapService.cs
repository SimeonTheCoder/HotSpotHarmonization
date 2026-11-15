using HSH.Core.DTOs;

namespace HSH.Core.Services.Contracts;

public interface IMapService
{
    public Task<CoordinatesResponseDTO[]> GetCountryFiresForPeriodOfTime(
        string countryCode,
        DateOnly start,
        DateOnly end
    );

    public Task<CoordinatesResponseDTO[]> GetRectCoords(string countryCode, float x1, float y1, float x2, float y2);

    public Task<int> CountFiresCountryPeriodOfTime(
        string countryCode,
        DateOnly start,
        DateOnly end
    );
}
