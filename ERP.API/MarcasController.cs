using ERP.Persistence.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MarcasController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MarcasController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var marcas = await _context.Marcas
            .Where(m => m.Activo)
            .OrderBy(m => m.Nombre)
            .ToListAsync();

        return Ok(marcas);
    }
}