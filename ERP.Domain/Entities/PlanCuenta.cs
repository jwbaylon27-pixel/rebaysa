using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ERP.Domain.Entities
{
    [Table("PlanCuentas")]
    public class PlanCuenta
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(20)]
        public string Codigo { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string Nombre { get; set; } = string.Empty;

        /// <summary>
        /// Activo, Pasivo, Patrimonio, Ingreso, Gasto
        /// </summary>
        [StringLength(30)]
        public string Tipo { get; set; } = string.Empty;

        /// <summary>
        /// Activo Circulante, Pasivo Corriente, etc.
        /// </summary>
        [StringLength(80)]
        public string? Clasificacion { get; set; }

        /// <summary>
        /// Nivel jerárquico dentro del PCGE.
        /// </summary>
        public int Nivel { get; set; }

        /// <summary>
        /// Permite registrar movimientos.
        /// </summary>
        public bool EsMovimiento { get; set; } = true;

        /// <summary>
        /// Cuenta padre.
        /// </summary>
        public int? CuentaPadreId { get; set; }

        [ForeignKey(nameof(CuentaPadreId))]
        public virtual PlanCuenta? CuentaPadre { get; set; }
        public bool Activo { get; set; } = true;
        public virtual ICollection<PlanCuenta>? SubCuentas { get; set; }
        public virtual ICollection<AsientoDetalle> Asientos { get; set; }
            = new List<AsientoDetalle>();
    }
}