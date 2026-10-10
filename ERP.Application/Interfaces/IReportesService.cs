namespace ERP.Application.Interfaces;

using ERP.Application.DTOs.Reportes;

public interface IReportesService
{
    Task<IEnumerable<RegistroVentaDto>> RegistroVentasAsync(
        DateTime? fechaInicio,
        DateTime? fechaFin);
}
