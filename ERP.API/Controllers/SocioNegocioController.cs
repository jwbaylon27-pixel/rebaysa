using ERP.API.Dtos;
using ERP.Domain.Entities;
using ERP.Persistence.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace ERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]

    public class SocioNegocioController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SocioNegocioController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/SocioNegocio
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SocioNegocio>>> GetSociosNegocio()
        {
            return await _context.SociosNegocio.ToListAsync();
        }

        // GET: api/SocioNegocio/proveedores
        [HttpGet("proveedores")]
        public async Task<ActionResult<IEnumerable<SocioNegocio>>> GetProveedores()
        {
            return await _context.SociosNegocio
                .Where(s => s.TipoSocio == "P")
                .ToListAsync();
        }

        // GET: api/SocioNegocio/clientes
        [HttpGet("clientes")]
        public async Task<ActionResult<IEnumerable<SocioNegocio>>> GetClientes()
        {
            return await _context.SociosNegocio
                .Where(s => s.TipoSocio == "C")
                .ToListAsync();
        }

        // GET: api/SocioNegocio/5
        [HttpGet("{id}")]
        public async Task<ActionResult<SocioNegocio>> GetSocioNegocio(int id)
        {
            var socio = await _context.SociosNegocio.FindAsync(id);

            if (socio == null)
            {
                return NotFound();
            }

            return socio;
        }

        // POST: api/SocioNegocio
        [HttpPost]
        public async Task<ActionResult<SocioNegocio>> PostSocioNegocio(SocioNegocio socio)
        {
            if (await _context.SociosNegocio.AnyAsync(s => s.NumeroDocumento == socio.NumeroDocumento))
            {
                return BadRequest("Ya existe un socio con ese número de documento.");
            }

            _context.SociosNegocio.Add(socio);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetSocioNegocio), new { id = socio.Id }, socio);
        }


        // PUT: api/SocioNegocio/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutSocioNegocio(int id, SocioNegocio socio)
        {
            if (id != socio.Id)
            {
                return BadRequest();
            }

            _context.Entry(socio).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.SociosNegocio.Any(e => e.Id == id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return Ok(socio);
        }

        // DELETE: api/SocioNegocio/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSocioNegocio(int id)
        {
            var socio = await _context.SociosNegocio.FindAsync(id);
            if (socio == null)
            {
                return NotFound();
            }

            _context.SociosNegocio.Remove(socio);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
