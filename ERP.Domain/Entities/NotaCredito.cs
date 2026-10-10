namespace ERP.Domain.Entities;

public class NotaCredito
{
    public int Id { get; set; }
    public int VentaId { get; set; }
    public Venta? Venta { get; set; }
    public DateTime Fecha { get; set; }
    public string Serie { get; set; } = string.Empty;
    public string NumeroDocumento { get; set; } = string.Empty;
    public string? Motivo { get; set; }
    public string TipoAfectacion { get; set; } = "TOTAL"; // TOTAL | PARCIAL
    public bool DevolucionFisica { get; set; }
    public decimal SubTotal { get; set; }
    public decimal IGV { get; set; }
    public decimal Total { get; set; }
    public string Estado { get; set; } = "REGISTRADO";
    public int UsuarioId { get; set; }
    public int? AsientoId { get; set; }
    public List<NotaCreditoDetalle> Detalles { get; set; } = new();
}

public class NotaCreditoDetalle
{
    public int Id { get; set; }
    public int NotaCreditoId { get; set; }
    public NotaCredito? NotaCredito { get; set; }
    public int ProductoId { get; set; }
    public Producto? Producto { get; set; }
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Total { get; set; }
}
