// ====================================================================
// CONTROLLER — ERP.API/Controllers/ReportesController.cs
// ====================================================================
namespace ERP.API.Controllers;

using ERP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMINISTRADOR,VENDEDOR")]
public class ReportesController : ControllerBase
{
    private readonly IReportesService _service;

    public ReportesController(IReportesService service)
    {
        _service = service;
    }

    // GET api/reportes/registro-ventas?fechaInicio=2026-01-01&fechaFin=2026-01-31
    [HttpGet("registro-ventas")]
    public async Task<IActionResult> RegistroVentas(
        [FromQuery] DateTime? fechaInicio,
        [FromQuery] DateTime? fechaFin)
    {
        var data = await _service.RegistroVentasAsync(fechaInicio, fechaFin);
        return Ok(data);
    }
}