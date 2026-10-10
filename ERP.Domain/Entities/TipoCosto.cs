using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ERP.Domain.Entities;

[Table("LC_TipoCosto")]
public class TipoCosto
{
    [Key]
    public int TipoCostoId { get; set; }
    [StringLength(30)]
    public string Codigo { get; set; } = string.Empty;
    [StringLength(100)]
    public string Nombre { get; set; } = string.Empty;
    [StringLength(250)]
    public string? Descripcion { get; set; }
    public int MetodoDistribucionId { get; set; } // metodo por defecto para este tipo de costo
    public bool Activo { get; set; } = true;

    public MetodoDistribucion? MetodoDistribucion { get; set; }
}