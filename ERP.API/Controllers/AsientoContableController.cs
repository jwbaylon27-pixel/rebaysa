// ====================================================================
// CONTROLLER — ERP.API/Controllers/AsientoContableController.cs
// Usa las mismas propiedades de navegacion que ya configuraste en
// ApplicationDbContext: AsientoContable.Detalles, AsientoDetalle.PlanCuenta
// ====================================================================
namespace ERP.API.Controllers;
 
using ERP.API.Dtos;
using ERP.Persistence.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
 
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AsientoContableController : ControllerBase
{
    private readonly ApplicationDbContext _context;
 
    public AsientoContableController(ApplicationDbContext context)
    {
        _context = context;
    }
 
    // GET api/AsientoContable/5
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Obtener(int id)
    {
        var asiento = await _context.AsientosContables
            .Include(a => a.Detalles)
                .ThenInclude(d => d.PlanCuenta)
            .FirstOrDefaultAsync(a => a.Id == id);
 
        if (asiento == null)
            return NotFound(new { error = "El asiento contable no existe." });
 
        var dto = new AsientoContableDto(
            asiento.Id,
            asiento.Fecha,
            asiento.TipoOperacion,
            asiento.ReferenciaId,
            asiento.Glosa,
            asiento.TotalDebe,
            asiento.TotalHaber,
            asiento.Detalles.Select(d => new AsientoContableLineaDto(
                d.CuentaId,
                d.PlanCuenta != null ? d.PlanCuenta.Codigo : string.Empty,
                d.PlanCuenta != null ? d.PlanCuenta.Nombre : string.Empty,
                d.Debe,
                d.Haber,
                d.Glosa
            )).ToList()
        );
 
        return Ok(dto);
    }
}
