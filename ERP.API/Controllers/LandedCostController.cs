using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

using ERP.Application.DTOs;
using ERP.Application.Interfaces; // ILiquidacionCostoService (capa de aplicación)
using ERP.Domain.Entities; // EstadosLiquidacion, MetodoDistribucionCodigos (constantes compartidas)

namespace ERP.API.Controllers.LandedCost
{
    /// <summary>
    /// Controlador del módulo de Liquidación de Costo (Landed Cost).
    /// Las constantes de estado (<see cref="EstadosLiquidacion"/>) y de código de
    /// método de distribución (<see cref="MetodoDistribucionCodigos"/>) viven en
    /// ERP.Domain.Entities (ver LiquidacionCostoEntities.cs) y se
    /// comparten entre el controlador y el servicio.
    /// Expone catálogos, creación de la liquidación, registro de conceptos de costo,
    /// cálculo de distribución (soporta los 5 métodos definidos en el catálogo
    /// <c>MetodoDistribucion</c>: Valor, Peso, Volumen, Cantidad y Manual) y la
    /// confirmación, que genera el asiento contable, revaloriza el inventario y
    /// registra el movimiento en el Kardex.
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api/liquidaciones-costo")]
    [Produces("application/json")]
    public class LandedCostController : ControllerBase
    {
        private readonly ILiquidacionCostoService _service;
        private readonly ILogger<LandedCostController> _logger;

        public LandedCostController(
            ILiquidacionCostoService service,
            ILogger<LandedCostController> logger)
        {
            _service = service;
            _logger = logger;
        }

        // =====================================================================
        // CATÁLOGOS
        // =====================================================================

        /// <summary>Catálogo de métodos de distribución (Valor, Peso, Volumen, Cantidad, Manual).</summary>
        [HttpGet("catalogos/metodos-distribucion")]
        [ProducesResponseType(typeof(IEnumerable<MetodoDistribucionDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ObtenerMetodosDistribucion()
        {
            var result = await _service.ObtenerMetodosDistribucionAsync();
            return Ok(result);
        }

        /// <summary>Catálogo de tipos de costo (Flete, Seguro, Aduana, Almacenaje, etc.) con su método de distribución por defecto.</summary>
        [HttpGet("catalogos/tipos-costo")]
        [ProducesResponseType(typeof(IEnumerable<TipoCostoDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ObtenerTiposCosto()
        {
            var result = await _service.ObtenerTiposCostoAsync();
            return Ok(result);
        }

        // =====================================================================
        // CONSULTA / LISTADO
        // =====================================================================

        /// <summary>Lista/búsqueda de liquidaciones de costo con filtros opcionales.</summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<LiquidacionCostoDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> Listar(
            [FromQuery] string? estado,
            [FromQuery] int? almacenId,
            [FromQuery] DateTime? fechaDesde,
            [FromQuery] DateTime? fechaHasta,
            [FromQuery] string? numero)
        {
            var result = await _service.ListarAsync(estado, almacenId, fechaDesde, fechaHasta, numero);
            return Ok(result);
        }

        /// <summary>Obtiene el detalle completo de una liquidación de costo (compras, conceptos de costo).</summary>
        [HttpGet("{id:long}")]
        [ProducesResponseType(typeof(LiquidacionCostoDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ObtenerPorId(long id)
        {
            var result = await _service.ObtenerPorIdAsync(id);
            if (result == null)
                return NotFound(new { message = $"No se encontró la liquidación de costo con Id {id}." });

            return Ok(result);
        }

        // =====================================================================
        // CREACIÓN
        // =====================================================================

        /// <summary>
        /// Crea una nueva liquidación de costo, asociando una o más compras (recepciones)
        /// sobre las cuales se distribuirán los conceptos de costo adicionales.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(LiquidacionCostoDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Crear([FromBody] CrearLiquidacionDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(dto.Numero))
                return BadRequest(new { message = "El número de liquidación es obligatorio." });

            if (dto.CompraIds == null || dto.CompraIds.Count == 0)
                return BadRequest(new { message = "Debe asociar al menos una compra a la liquidación de costo." });

            var usuarioId = dto.UsuarioId ?? ObtenerUsuarioAutenticadoId();

            try
            {
                var creada = await _service.CrearAsync(dto, usuarioId);
                return CreatedAtAction(nameof(ObtenerPorId), new { id = creada.LiquidacionCostoId }, creada);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Error de negocio al crear la liquidación de costo.");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>Anula una liquidación de costo que aún no ha sido confirmada.</summary>
        [HttpDelete("{id:long}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Anular(long id)
        {
            var existente = await _service.ObtenerPorIdAsync(id);
            if (existente == null)
                return NotFound(new { message = $"No se encontró la liquidación de costo con Id {id}." });

            if (existente.Estado == EstadosLiquidacion.Confirmado)
                return BadRequest(new { message = "No se puede anular una liquidación ya confirmada. Debe generar un ajuste contable." });

            var usuarioId = ObtenerUsuarioAutenticadoId();
            var anulada = await _service.AnularAsync(id, usuarioId);
            if (!anulada)
                return BadRequest(new { message = "No fue posible anular la liquidación de costo." });

            return NoContent();
        }

        // =====================================================================
        // CONCEPTOS DE COSTO
        // =====================================================================

        /// <summary>Agrega un concepto de costo (flete, seguro, aduana, almacenaje, etc.) a la liquidación.</summary>
        [HttpPost("{id:long}/costos")]
        [ProducesResponseType(typeof(LiquidacionCostoDetalleDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AgregarCosto(long id, [FromBody] AgregarCostoDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (dto.Importe <= 0)
                return BadRequest(new { message = "El importe del concepto de costo debe ser mayor a cero." });

            var liquidacion = await _service.ObtenerPorIdAsync(id);
            if (liquidacion == null)
                return NotFound(new { message = $"No se encontró la liquidación de costo con Id {id}." });

            if (liquidacion.Estado == EstadosLiquidacion.Confirmado || liquidacion.Estado == EstadosLiquidacion.Anulado)
                return BadRequest(new { message = $"No se pueden agregar costos a una liquidación en estado {liquidacion.Estado}." });

            try
            {
                var costo = await _service.AgregarCostoAsync(id, dto);
                return CreatedAtAction(nameof(ObtenerPorId), new { id }, costo);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Error de negocio al agregar el concepto de costo a la liquidación {Id}.", id);
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>Actualiza un concepto de costo existente (monto, proveedor, documento, moneda, método de distribución).</summary>
        [HttpPut("{id:long}/costos/{costoDetalleId:long}")]
        [ProducesResponseType(typeof(LiquidacionCostoDetalleDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ActualizarCosto(long id, long costoDetalleId, [FromBody] AgregarCostoDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (dto.Importe <= 0)
                return BadRequest(new { message = "El importe del concepto de costo debe ser mayor a cero." });

            var actualizado = await _service.ActualizarCostoAsync(id, costoDetalleId, dto);
            if (actualizado == null)
                return NotFound(new { message = "Liquidación o concepto de costo no encontrado, o no editable en su estado actual." });

            return Ok(actualizado);
        }

        /// <summary>Elimina un concepto de costo de la liquidación (solo si no ha sido confirmada).</summary>
        [HttpDelete("{id:long}/costos/{costoDetalleId:long}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> EliminarCosto(long id, long costoDetalleId)
        {
            var eliminado = await _service.EliminarCostoAsync(id, costoDetalleId);
            if (!eliminado)
                return NotFound(new { message = "Liquidación o concepto de costo no encontrado, o no editable en su estado actual." });

            return NoContent();
        }

        // =====================================================================
        // CÁLCULO DE DISTRIBUCIÓN (5 MÉTODOS: VALOR, PESO, VOLUMEN, CANTIDAD, MANUAL)
        // =====================================================================

        /// <summary>
        /// Calcula la distribución de los costos adicionales entre los ítems de las
        /// compras asociadas. Cada concepto de costo (<c>LiquidacionCostoDetalle</c>) usa
        /// su propio método de distribución (heredado del <c>TipoCosto</c> o sobreescrito
        /// al agregarlo):
        /// <list type="bullet">
        /// <item>VALOR: proporcional al valor de compra de cada línea.</item>
        /// <item>PESO: proporcional al peso total de cada línea.</item>
        /// <item>VOLUMEN: proporcional al volumen (m3) de cada línea.</item>
        /// <item>CANTIDAD: proporcional a la cantidad de unidades de cada línea.</item>
        /// <item>MANUAL: usa los porcentajes indicados explícitamente en <see cref="CalcularLiquidacionDto.PorcentajesManuales"/>.</item>
        /// </list>
        /// El resultado queda como una previsualización editable (estado CALCULADO);
        /// no genera asiento contable ni movimientos de inventario/Kardex.
        /// </summary>
        [HttpPost("{id:long}/calcular")]
        [ProducesResponseType(typeof(ResultadoCalculoDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Calcular(long id, [FromBody] CalcularLiquidacionDto dto)
        {
            var liquidacion = await _service.ObtenerPorIdAsync(id);
            if (liquidacion == null)
                return NotFound(new { message = $"No se encontró la liquidación de costo con Id {id}." });

            if (liquidacion.Estado == EstadosLiquidacion.Confirmado)
                return BadRequest(new { message = "La liquidación ya fue confirmada; la distribución no puede recalcularse." });

            if (liquidacion.Estado == EstadosLiquidacion.Anulado)
                return BadRequest(new { message = "No se puede calcular una liquidación anulada." });

            if (liquidacion.Costos == null || liquidacion.Costos.Count == 0)
                return BadRequest(new { message = "La liquidación no tiene conceptos de costo registrados para distribuir." });

            // Validación temprana: si algún concepto usa el método MANUAL, sus porcentajes
            // deben venir informados y sumar 100% por concepto.
            var costosManuales = liquidacion.Costos
                .Where(c => string.Equals(c.MetodoDistribucion, MetodoDistribucionCodigos.Manual, StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (costosManuales.Count > 0)
            {
                foreach (var costoManual in costosManuales)
                {
                    var grupo = dto.PorcentajesManuales?
                        .FirstOrDefault(p => p.LiquidacionCostoDetalleId == costoManual.LiquidacionCostoDetalleId);

                    if (grupo == null || grupo.Porcentajes == null || grupo.Porcentajes.Count == 0)
                    {
                        return BadRequest(new
                        {
                            message = $"El concepto de costo '{costoManual.TipoCosto}' usa distribución MANUAL " +
                                      "y requiere que se informen los porcentajes por línea de compra."
                        });
                    }

                    var sumaPorcentajes = grupo.Porcentajes.Sum(p => p.Porcentaje);
                    if (Math.Abs(sumaPorcentajes - 100m) > 0.01m)
                    {
                        return BadRequest(new
                        {
                            message = $"Los porcentajes manuales del concepto '{costoManual.TipoCosto}' deben sumar 100% " +
                                      $"(suma actual: {sumaPorcentajes}%)."
                        });
                    }
                }
            }

            try
            {
                var resultado = await _service.CalcularAsync(id, dto);
                return Ok(resultado);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Error al calcular la distribución de costos de la liquidación {Id}.", id);
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>Obtiene el último cálculo de distribución realizado para la liquidación.</summary>
        [HttpGet("{id:long}/calculo")]
        [ProducesResponseType(typeof(ResultadoCalculoDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ObtenerUltimoCalculo(long id)
        {
            var resultado = await _service.ObtenerUltimoCalculoAsync(id);
            if (resultado == null)
                return NotFound(new { message = "Aún no se ha calculado una distribución para esta liquidación." });

            return Ok(resultado);
        }

        // =====================================================================
        // CONFIRMACIÓN: ASIENTO CONTABLE + REVALORIZACIÓN DE INVENTARIO + KARDEX
        // =====================================================================

        /// <summary>
        /// Confirma la liquidación de costo. La operación es transaccional (a cargo de la
        /// capa de aplicación) y ejecuta, en orden:
        /// 1. Valida que exista un cálculo de distribución vigente (estado CALCULADO).
        /// 2. Genera el asiento contable (<c>LiquidacionAsiento</c> / <c>LiquidacionAsientoDetalle</c>),
        ///    debitando la cuenta de mercadería/inventario y acreditando las cuentas
        ///    contables de cada concepto de costo (proveedor/provisión).
        /// 3. Revaloriza el costo unitario de inventario de cada producto afectado.
        /// 4. Registra el movimiento de ajuste en el Kardex de cada producto.
        /// 5. Marca la liquidación como CONFIRMADO (no editable).
        /// Si cualquier paso falla, toda la operación se revierte.
        /// </summary>
        [HttpPost("{id:long}/confirmar")]
        [ProducesResponseType(typeof(ResultadoConfirmacionDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Confirmar(long id, [FromBody] ConfirmarLiquidacionDto dto)
        {
            var liquidacion = await _service.ObtenerPorIdAsync(id);
            if (liquidacion == null)
                return NotFound(new { message = $"No se encontró la liquidación de costo con Id {id}." });

            if (liquidacion.Estado == EstadosLiquidacion.Confirmado)
                return Conflict(new { message = "La liquidación de costo ya se encuentra confirmada." });

            if (liquidacion.Estado == EstadosLiquidacion.Anulado)
                return BadRequest(new { message = "No se puede confirmar una liquidación anulada." });

            if (liquidacion.Estado != EstadosLiquidacion.Calculado)
                return BadRequest(new { message = "Debe calcular la distribución de costos antes de confirmar la liquidación." });

            var usuarioId = dto.UsuarioId ?? ObtenerUsuarioAutenticadoId();

            try
            {
                var resultado = await _service.ConfirmarAsync(id, dto, usuarioId);
                return Ok(resultado);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Error de negocio al confirmar la liquidación de costo {Id}.", id);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inesperado al confirmar la liquidación de costo {Id}.", id);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = "Ocurrió un error al confirmar la liquidación de costo. La operación fue revertida." });
            }
        }

        // =====================================================================
        // HELPERS
        // =====================================================================

        /// <summary>
        /// Obtiene el Id del usuario autenticado a partir de los claims del token.
        /// Se usa como valor por defecto cuando el DTO no trae UsuarioId explícito.
        /// </summary>
        private int ObtenerUsuarioAutenticadoId()
        {
            var claim = User?.FindFirst("usuarioId") ?? User?.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null && int.TryParse(claim.Value, out var usuarioId) ? usuarioId : 0;
        }
    }
}
