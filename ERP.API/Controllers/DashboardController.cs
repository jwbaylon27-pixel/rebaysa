using ERP.API.Dtos;
using ERP.Domain.Entities;
using ERP.Persistence.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ERP.API.Controllers;
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DashboardController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var compras = await _context.Compras
            .Include(c => c.Proveedor)
            .Include(c => c.Detalles).ThenInclude(d => d.Producto)
            .Select(c => new MovimientoComercialDto(
                c.Id,
                c.Fecha,
                c.ProveedorId,
                c.Proveedor != null ? c.Proveedor.Nombres : string.Empty,
                c.Detalles.Select(d => new MovimientoDetalleDto(
                    d.Id,
                    d.ProductoId,
                    d.Producto != null ? d.Producto.Nombre : string.Empty,
                    d.Cantidad,
                    d.PrecioUnitario,
                    d.Total
                )).ToList(),
                c.SubTotal,
                c.IGV,
                c.Total,
                c.Estado
            ))
            .ToListAsync();

        var ventas = await _context.Ventas
            .Include(v => v.Cliente)
            .Include(v => v.Detalles).ThenInclude(d => d.Producto)
            .Select(v => new MovimientoComercialDto(
                v.Id,
                v.Fecha,
                v.ClienteId,
                v.Cliente != null ? v.Cliente.Nombres : string.Empty,
                v.Detalles.Select(d => new MovimientoDetalleDto(
                    d.Id,
                    d.ProductoId,
                    d.Producto != null ? d.Producto.Nombre : string.Empty,
                    d.Cantidad,
                    d.PrecioUnitario,
                    d.Total
                )).ToList(),
                v.SubTotal,
                v.IGV,
                v.Total,
                v.Estado
            ))
            .ToListAsync();

        var movimientos = compras.Concat(ventas)
            .OrderByDescending(m => m.Fecha)
            .ToList();

        return Ok(movimientos);
    }
}
