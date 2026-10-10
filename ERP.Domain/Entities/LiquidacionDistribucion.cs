using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ERP.Domain.Entities;


[Table("LC_LiquidacionDistribucion")]
public class LiquidacionDistribucion
{
    [Key]
    public long LiquidacionDistribucionId { get; set; }
    public long LiquidacionCostoId { get; set; }
    public long LiquidacionCostoDetalleId { get; set; }
    public long CompraId { get; set; }
    public long CompraDetalleId { get; set; }
    public long ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal CostoCompraUnitario { get; set; }
    public decimal ValorCompra { get; set; }
    public decimal? Peso { get; set; }
    public decimal? Volumen { get; set; }
    public decimal BaseDistribucion { get; set; }
    public decimal PorcentajeDistribucion { get; set; }
    public decimal CostoAsignado { get; set; }
    public decimal CostoUnitarioAdicional { get; set; }
    public decimal CostoUnitarioFinal { get; set; }
    public decimal? CantidadStockActual { get; set; }
    public decimal? CostoInventarioAjustado { get; set; }
    public decimal? CostoVentaAjustado { get; set; }

    public LiquidacionCosto? LiquidacionCosto { get; set; }
    public LiquidacionCostoDetalle? LiquidacionCostoDetalle { get; set; }
}