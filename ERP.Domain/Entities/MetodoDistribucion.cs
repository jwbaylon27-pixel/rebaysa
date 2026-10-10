using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ERP.Domain.Entities;

[Table("LC_MetodoDistribucion")]
public class MetodoDistribucion
{
    [Key]
    public int MetodoDistribucionId { get; set; }
    [StringLength(20)]
    public string Codigo { get; set; } = string.Empty; // VALOR | CANTIDAD | PESO | VOLUMEN | MANUAL
    [StringLength(100)]
    public string Nombre { get; set; } = string.Empty;
    [StringLength(250)]
    public string? Descripcion { get; set; }
    public bool Activo { get; set; } = true;
}