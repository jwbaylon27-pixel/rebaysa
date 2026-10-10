using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ERP.Domain.Entities;

[Table("LC_LiquidacionAsiento")]
public class LiquidacionAsiento
{
    [Key]
    public long AsientoId { get; set; }
    public long LiquidacionCostoId { get; set; }
    [StringLength(30)]
    public string NumeroAsiento { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    [StringLength(300)]
    public string? Glosa { get; set; }
    [StringLength(20)]
    public string Estado { get; set; } = "REGISTRADO";
    public decimal TotalDebe { get; set; }
    public decimal TotalHaber { get; set; }
    public int? UsuarioId { get; set; }
    public DateTime FechaCreacion { get; set; }

    public List<LiquidacionAsientoDetalle> Detalles { get; set; } = new();
}