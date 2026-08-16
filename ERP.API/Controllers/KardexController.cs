using ERP.Application.DTOs;
using ERP.Application.DTOs.Kardex;
using ERP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace ERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMINISTRADOR,ALMACENERO")]
public class KardexController : ControllerBase
{
    private readonly IKardexService _service;
    public KardexController(IKardexService service)
    {
        _service = service;
    }

    //====================================================
    // GET api/kardex/resumen
    //====================================================
    [HttpGet("resumen")]
    public async Task<IActionResult> ObtenerResumen(
        [FromQuery] int productoId,
        [FromQuery] int almacenId)
    {
        var data = await _service.ObtenerResumenProductoAsync(
            productoId,
            almacenId);

        return Ok(data);
    }

    //====================================================
    // GET api/kardex/movimientos
    //====================================================
    [HttpGet("movimientos")]
    public async Task<IActionResult> ListarMovimientos(
        [FromQuery] KardexFiltroDto filtro)
    {
        var data = await _service.ListarMovimientosAsync(filtro);

        return Ok(data);
    }

    //====================================================
    // GET api/kardex/detalle/5
    //====================================================
    [HttpGet("detalle/{id:long}")]
    public async Task<IActionResult> ObtenerDetalle(long id)
    {
        var data =
            await _service.ObtenerDetalleMovimientoAsync(id);

        if (data == null)
            return NotFound();

        return Ok(data);
    }

    //====================================================
    // GET api/kardex/productos
    //====================================================
    [HttpGet("productos")]
    public async Task<IActionResult> BuscarProductos(
        [FromQuery] string texto = "")
    {
        var data =
            await _service.BuscarProductosAsync(texto);

        return Ok(data);
    }

    //====================================================
    // GET api/kardex/almacenes
    //====================================================
    [HttpGet("almacenes")]
    public async Task<IActionResult> ListarAlmacenes()
    {
        var data = await _service.ListarAlmacenesAsync();

        return Ok(data);
    }

    //====================================================
    // GET api/kardex/tiposmovimiento
    //====================================================
    [HttpGet("tiposmovimiento")]
    public async Task<IActionResult> ListarTiposMovimiento()
    {
        var data = await _service.ListarTiposMovimientoAsync();

        return Ok(data);
    }


    //====================================================
    // GET api/kardex/exportar/excel
    //====================================================
    [HttpGet("exportar/excel")]
    public async Task<IActionResult> ExportarExcel(
        [FromQuery] KardexFiltroDto filtro)
    {
        var archivo =
            await _service.ExportarExcelAsync(filtro);

        return File(
            archivo,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"Kardex_{DateTime.Now:yyyyMMddHHmmss}.xlsx");
    }

    //====================================================
    // GET api/kardex/exportar/pdf
    //====================================================
    [HttpGet("exportar/pdf")]
    public async Task<IActionResult> ExportarPdf(
        [FromQuery] KardexFiltroDto filtro)
    {
        var archivo =
            await _service.ExportarPdfAsync(filtro);

        return File(
            archivo,
            "application/pdf",
            $"Kardex_{DateTime.Now:yyyyMMddHHmmss}.pdf");
    }
}
