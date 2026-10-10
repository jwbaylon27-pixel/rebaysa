// ====================================================================
// IMPLEMENTACION — ERP.Application/Services/ReportesService.cs
// ====================================================================
namespace ERP.Application.Services;

using ERP.Application.DTOs.Reportes;
using ERP.Application.Interfaces;

public class ReportesService : IReportesService
{
    private readonly IReportesRepository _repository;

    public ReportesService(IReportesRepository repository)
    {
        _repository = repository;
    }

    public Task<IEnumerable<RegistroVentaDto>> RegistroVentasAsync(
        DateTime? fechaInicio,
        DateTime? fechaFin)
        => _repository.ReporteRegistroVentas(fechaInicio, fechaFin);
}
