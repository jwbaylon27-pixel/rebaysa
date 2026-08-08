namespace ERP.Domain.Entities;

public class Venta
{
    public int Id { get; set; }

    public int ClienteId { get; set; }

    public int UsuarioId { get; set; } = 1;

    public DateTime Fecha { get; set; } = DateTime.UtcNow;

    public string? TipoDocumento { get; set; }

    public string? Serie { get; set; }

    public string? NumeroDocumento { get; set; }

    public decimal SubTotal { get; set; }

    public decimal IGV { get; set; }

    public decimal Total { get; set; }

    public string? MetodoPago { get; set; }

    public string Estado { get; set; } = "REGISTRADO";

    public string? Observacion { get; set; }

    public int? AsientoId { get; set; }

    public SocioNegocio? Cliente { get; set; }

    public ICollection<VentaDetalle> Detalles { get; set; } = new List<VentaDetalle>();
}
