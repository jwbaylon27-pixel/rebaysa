using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using ERP.Application.Interfaces;

namespace ERP.API.Controllers
{
    public record TipoCambioDto(DateTime Fecha, decimal TipoCambio);

    /// <summary>
    /// Tipo de cambio diario (PEN/USD), fuente única usada por Compras, Ventas y
    /// Liquidación de Costo. No reemplaza el TipoCambio ya guardado en documentos
    /// existentes (esos quedan como snapshot histórico) — solo resuelve qué tasa
    /// aplicar a un documento nuevo, según su fecha.
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api/tipo-cambio")]
    public class TipoCambioController : ControllerBase
    {
        private readonly ITipoCambioService _service;

        public TipoCambioController(ITipoCambioService service)
        {
            _service = service;
        }

        /// <summary>T.C. vigente para una fecha (cae al último registrado si ese día no tiene uno propio).</summary>
        [HttpGet]
        [ProducesResponseType(typeof(TipoCambioDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Obtener([FromQuery] DateTime fecha)
        {
            try
            {
                var valor = await _service.ObtenerAsync(fecha);
                return Ok(new TipoCambioDto(fecha.Date, valor));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>Registra o actualiza el T.C. de un día puntual.</summary>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Registrar([FromBody] TipoCambioDto dto)
        {
            if (dto.TipoCambio <= 0)
                return BadRequest(new { message = "El tipo de cambio debe ser mayor que cero." });

            var usuarioId = ObtenerUsuarioAutenticadoId();

            try
            {
                await _service.RegistrarAsync(dto.Fecha, dto.TipoCambio, usuarioId);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private int ObtenerUsuarioAutenticadoId()
        {
            var claim = User?.FindFirst("usuarioId") ?? User?.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null && int.TryParse(claim.Value, out var usuarioId) ? usuarioId : 0;
        }
    }
}
