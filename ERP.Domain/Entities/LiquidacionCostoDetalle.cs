using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ERP.Domain.Entities;

[Table("LC_LiquidacionCostoDetalle")]
public class LiquidacionCostoDetalle
{
    [Key]
    public long LiquidacionCostoDetalleId { get; set; }
    public long LiquidacionCostoId { get; set; }
    public int TipoCostoId { get; set; }
    public int? ProveedorId { get; set; }
    [StringLength(10)]
    public string? TipoDocumento { get; set; }
    [StringLength(10)]
    public string? Serie { get; set; }
    [StringLength(30)]
    public string? NumeroDocumento { get; set; }
    public DateTime? FechaDocumento { get; set; }
    public decimal Importe { get; set; }
    [StringLength(3)]
    public string MonedaCodigo { get; set; } = "PEN";
    public decimal TipoCambio { get; set; } = 1;
    public decimal ImporteBase { get; set; } // Importe convertido a moneda de la liquidacion
    public int MetodoDistribucionId { get; set; }
    public int? CuentaContableId { get; set; }
    [StringLength(300)]
    public string? Observacion { get; set; }

    public LiquidacionCosto? LiquidacionCosto { get; set; }
    public TipoCosto? TipoCosto { get; set; }
    public MetodoDistribucion? MetodoDistribucion { get; set; }
    public List<LiquidacionDistribucion> Distribuciones { get; set; } = new();
}
