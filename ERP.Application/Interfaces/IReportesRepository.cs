namespace ERP.Application.Interfaces;

using ERP.Application.DTOs.Reportes;

public interface IReportesRepository
{
    Task<IEnumerable<RegistroVentaDto>> ReporteRegistroVentas(
        DateTime? fechaInicio,
        DateTime? fechaFin);
}
