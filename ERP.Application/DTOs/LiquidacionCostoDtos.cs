using System;
using System.Collections.Generic;

namespace ERP.Application.DTOs;

// ---------- Catalogos ----------

public record MetodoDistribucionDto(int MetodoDistribucionId, string Codigo, string Nombre, string? Descripcion);

public record TipoCostoDto(
    int TipoCostoId, string Codigo, string Nombre, string? Descripcion,
    int MetodoDistribucionId, string MetodoDistribucionCodigo, string MetodoDistribucionNombre
);

// ---------- Crear liquidacion ----------

public class CrearLiquidacionDto
{
    public string Numero { get; set; } = string.Empty;
    public DateTime? Fecha { get; set; }
    public int? AlmacenId { get; set; }
    public string? MonedaCodigo { get; set; }
    public decimal? TipoCambio { get; set; }
    public string? Observacion { get; set; }
    public List<int> CompraIds { get; set; } = new();
    public int? UsuarioId { get; set; }
}

// ---------- Agregar concepto de costo ----------

public class AgregarCostoDto
{
    public int TipoCostoId { get; set; }
    public int? ProveedorId { get; set; }
    public string? TipoDocumento { get; set; }
    public string? Serie { get; set; }
    public string? NumeroDocumento { get; set; }
    public DateTime? FechaDocumento { get; set; }
    public decimal Importe { get; set; }
    public string? MonedaCodigo { get; set; }
    public decimal? TipoCambio { get; set; }
    public int? MetodoDistribucionId { get; set; } // si no se manda, usa el default del TipoCosto
    public int? CuentaContableId { get; set; }
    public string? Observacion { get; set; }
}

// ---------- Calcular distribucion ----------

public class PorcentajeManualDto
{
    public long CompraDetalleId { get; set; }
    public decimal Porcentaje { get; set; } // 0-100
}

public class PorcentajesManualesPorCostoDto
{
    public long LiquidacionCostoDetalleId { get; set; }
    public List<PorcentajeManualDto> Porcentajes { get; set; } = new();
}

public class CalcularLiquidacionDto
{
    // Solo necesario si algun concepto de costo usa el metodo MANUAL
    public List<PorcentajesManualesPorCostoDto>? PorcentajesManuales { get; set; }
}

// ---------- Confirmar ----------

public class ConfirmarLiquidacionDto
{
    public int? UsuarioId { get; set; }
    public int? CuentaMercaderiaId { get; set; } // si no se manda, usa el codigo 201
}

// ---------- Resultados ----------

public record LiquidacionCompraDto(long LiquidacionCompraId, int CompraId, string Proveedor, string Documento, decimal TotalCompra);

public record LiquidacionCostoDetalleDto(
    long LiquidacionCostoDetalleId, int TipoCostoId, string TipoCosto,
    int? ProveedorId, string? Proveedor, string? TipoDocumento, string? Serie, string? NumeroDocumento,
    decimal Importe, string MonedaCodigo, decimal TipoCambio, decimal ImporteBase,
    int MetodoDistribucionId, string MetodoDistribucion, int? CuentaContableId
);

public record LiquidacionCostoDto(
    long LiquidacionCostoId, string Numero, DateTime Fecha, int? AlmacenId,
    string MonedaCodigo, decimal TipoCambio, string Estado,
    decimal TotalMercaderia, decimal TotalCostos, decimal TotalLiquidacion,
    long? AsientoContableId, string? Observacion,
    List<LiquidacionCompraDto> Compras,
    List<LiquidacionCostoDetalleDto> Costos
);

public record ItemCalculadoDto(
    long ProductoId, string Producto, decimal Cantidad,
    decimal CostoCompraUnitario, decimal CostoUnitarioAdicional, decimal CostoUnitarioFinal,
    decimal ValorCompra, decimal CostoTotalAsignado
);

public record ResultadoCalculoDto(
    long LiquidacionCostoId, decimal TotalMercaderia, decimal TotalCostos, decimal TotalLiquidacion,
    List<ItemCalculadoDto> Items
);

public record ResultadoConfirmacionDto(
    long LiquidacionCostoId, long AsientoId, string NumeroAsiento,
    decimal TotalDebe, decimal TotalHaber, int ProductosRevalorizados
);
