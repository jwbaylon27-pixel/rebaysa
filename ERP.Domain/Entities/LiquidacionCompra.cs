using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ERP.Domain.Entities;

[Table("LC_LiquidacionCompra")]
public class LiquidacionCompra
{
    [Key]
    public long LiquidacionCompraId { get; set; }
    public long LiquidacionCostoId { get; set; }
    public int CompraId { get; set; }
    public decimal TotalCompra { get; set; }
    public DateTime FechaRegistro { get; set; }

    public LiquidacionCosto? LiquidacionCosto { get; set; }
    public Compra? Compra { get; set; }
}