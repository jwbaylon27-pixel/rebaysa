using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ERP.Domain.Entities;

[Table("AsientoContableDetalle")]
public class AsientoDetalle
{
    [Key]
    public int Id { get; set; }

    public int AsientoId { get; set; }

    public int CuentaId { get; set; }

    public decimal Debe { get; set; }

    public decimal Haber { get; set; }

    public string? Glosa { get; set; }

    [ForeignKey(nameof(AsientoId))]
    public virtual AsientoContable AsientoContable { get; set; } = null!;

    [ForeignKey(nameof(CuentaId))]
    public virtual PlanCuenta PlanCuenta { get; set; } = null!;
}