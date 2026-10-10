using ERP.Domain.Dtos.Sunat;

namespace ERP.Application.Interfaces;

public interface ISunatService
{
    Task<RucConsultaDto> ConsultarRucAsync(
        string ruc,
        CancellationToken cancellationToken = default);
}