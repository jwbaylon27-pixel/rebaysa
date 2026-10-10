using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ERP.Domain.Entities;

[Table("LC_LiquidacionCosto")]
public class LiquidacionCosto
{
    [Key]
    public long LiquidacionCostoId { get; set; }
    [StringLength(30)]
    public string Numero { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public int? AlmacenId { get; set; }
    [StringLength(3)]
    public string MonedaCodigo { get; set; } = "PEN";
    public decimal TipoCambio { get; set; } = 1;
    [StringLength(20)]
    public string Estado { get; set; } = "BORRADOR"; // BORRADOR | CALCULADO | CONFIRMADO | ANULADO
    public decimal TotalMercaderia { get; set; }
    public decimal TotalCostos { get; set; }
    public decimal TotalLiquidacion { get; set; }
    public long? AsientoContableId { get; set; }
    [StringLength(500)]
    public string? Observacion { get; set; }
    public int? UsuarioCreacionId { get; set; }
    public DateTime FechaCreacion { get; set; }
    public int? UsuarioModificacionId { get; set; }
    public DateTime? FechaModificacion { get; set; }

    public List<LiquidacionCompra> Compras { get; set; } = new();
    public List<LiquidacionCostoDetalle> Costos { get; set; } = new();
    public List<LiquidacionDistribucion> Distribuciones { get; set; } = new();
}