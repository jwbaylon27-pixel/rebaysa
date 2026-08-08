namespace ERP.Domain.Entities;

public class Compra
{
    public int Id { get; set; }
    public int ProveedorId { get; set; }
    public int UsuarioId { get; set; } = 1;
    public DateTime Fecha { get; set; }
    public string? TipoDocumento { get; set; }
    public string? Serie { get; set; }
    public string? NumeroDocumento { get; set; }
    public decimal SubTotal { get; set; }
    public decimal IGV { get; set; }
    public decimal Total { get; set; }
    public string? Observacion { get; set; }
    public string Estado { get; set; } = "REGISTRADO";
    public int? AsientoId { get; set; }
    public SocioNegocio? Proveedor { get; set; }
    public ICollection<CompraDetalle> Detalles { get; set; } = new List<CompraDetalle>();
}
