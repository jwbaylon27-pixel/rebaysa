using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ERP.Domain.Entities
{
    [Table("AsientosContables")]
    public class AsientoContable
    {
        [Key]
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        [StringLength(30)]
        public string TipoOperacion { get; set; } = "";
        [StringLength(20)]
        public string TipoDocumento { get; set; } = "";
        public int DocumentoId { get; set; }
        [StringLength(500)]
        public string Glosa { get; set; } = "";
        public decimal TotalDebe { get; set; }
        public decimal TotalHaber { get; set; }
        public bool Anulado { get; set; }
        public virtual ICollection<AsientoDetalle> Detalles { get; set; }
            = new List<AsientoDetalle>();
    }
}