using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using ERP.Application.DTOs;

namespace ERP.Application.Interfaces
{
    /// <summary>
    /// Contrato del servicio de aplicación del módulo de Liquidación de Costo (Landed Cost).
    /// Implementado con EF Core en <c>LiquidacionCostoService</c>.
    /// </summary>
    public interface ILiquidacionCostoService
    {
        // ---------- Catálogos ----------
        Task<List<MetodoDistribucionDto>> ObtenerMetodosDistribucionAsync();
        Task<List<TipoCostoDto>> ObtenerTiposCostoAsync();

        // ---------- Consulta ----------
        Task<List<LiquidacionCostoDto>> ListarAsync(
            string? estado, int? almacenId, DateTime? fechaDesde, DateTime? fechaHasta, string? numero);

        Task<LiquidacionCostoDto?> ObtenerPorIdAsync(long id);

        // ---------- Creación / anulación ----------
        Task<LiquidacionCostoDto> CrearAsync(CrearLiquidacionDto dto, int usuarioId);
        Task<bool> AnularAsync(long id, int usuarioId);

        // ---------- Conceptos de costo ----------
        Task<LiquidacionCostoDetalleDto> AgregarCostoAsync(long liquidacionId, AgregarCostoDto dto);
        Task<LiquidacionCostoDetalleDto?> ActualizarCostoAsync(long liquidacionId, long costoDetalleId, AgregarCostoDto dto);
        Task<bool> EliminarCostoAsync(long liquidacionId, long costoDetalleId);

        // ---------- Cálculo de distribución ----------
        Task<ResultadoCalculoDto> CalcularAsync(long liquidacionId, CalcularLiquidacionDto dto);
        Task<ResultadoCalculoDto?> ObtenerUltimoCalculoAsync(long liquidacionId);

        // ---------- Confirmación ----------
        Task<ResultadoConfirmacionDto> ConfirmarAsync(long liquidacionId, ConfirmarLiquidacionDto dto, int usuarioId);
    }
}
