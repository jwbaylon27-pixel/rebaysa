using ERP.Application.Interfaces;
using ERP.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace ERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductosController : ControllerBase
{
    private readonly IProductoRepository _repository;
    private readonly IKardexRepository _kardexRepository;

    public ProductosController(IProductoRepository repository, IKardexRepository kardexRepository)
    {
        _repository = repository;
        _kardexRepository = kardexRepository;
    }

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var data = await _repository.ListarAsync();

        var resultado = data.Select(p => new {
            p.Id,
            p.CategoriaId,
            p.MarcaId,
            p.Codigo,
            p.Nombre,
            p.UnidadMedida,
            p.PrecioCompra,
            p.PrecioVenta,
            p.StockMinimo,
            p.Stock,
            p.Activo
        });

        return Ok(resultado);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Obtener(int id)
    {
        var data = await _repository.ObtenerAsync(id);

        if (data == null)
            return NotFound();

        return Ok(data);
    }

    [HttpPost]
    [Authorize(Roles = "ADMINISTRADOR,ALMACENERO")]
    public async Task<IActionResult> Crear(Producto producto)
    {
        var id = await _repository.CrearAsync(producto);

        return Ok(id);
    }

    [HttpPut]
    [Authorize(Roles = "ADMINISTRADOR,ALMACENERO")]
    public async Task<IActionResult> Actualizar(Producto producto)
    {
        await _repository.ActualizarAsync(producto);

        return Ok();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMINISTRADOR,ALMACENERO")]
    public async Task<IActionResult> Eliminar(int id)
    {
        await _repository.EliminarAsync(id);

        return Ok();
    }
/*
    [HttpGet("buscar")]
    public async Task<IActionResult> Buscar([FromQuery] string texto)
    {
        var productos = await _repository.ListarAsync();
        var resultado = productos
            .Where(p =>
                p.Activo &&
                (
                    p.Codigo.Contains(texto) ||
                    p.Nombre.Contains(texto)
                ))
            .Select(p => new
            {
                id = p.Id,
                codigo = p.Codigo,
                descripcion = p.Nombre,
                stock = p.Stock,
                stockMinimo = p.StockMinimo
            })
            .OrderBy(p => p.descripcion)
            .Take(20);
        return Ok(resultado);
    }
*/
    [HttpGet("buscar")]
    public async Task<IActionResult> Buscar([FromQuery] string texto)
    {
        var data = await _kardexRepository.BuscarProductos(texto);

        return Ok(data);
    }

}
