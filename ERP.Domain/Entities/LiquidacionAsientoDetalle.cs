
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ERP.Domain.Entities;

[Table("LC_LiquidacionAsientoDetalle")]
public class LiquidacionAsientoDetalle
{
    [Key]
    public long AsientoDetalleId { get; set; }
    public long AsientoId { get; set; }
    public int Linea { get; set; }
    public int CuentaContableId { get; set; }
    [StringLength(250)]
    public string? Descripcion { get; set; }
    public decimal Debe { get; set; }
    public decimal Haber { get; set; }
    public int? ProveedorId { get; set; }

    public LiquidacionAsiento? Asiento { get; set; }
    public PlanCuenta? CuentaContable { get; set; }
}
