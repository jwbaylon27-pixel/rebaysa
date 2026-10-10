namespace ERP.Domain.Entities;

public class PagoVenta
{
    public int Id { get; set; }
    public int VentaId { get; set; }
    public Venta? Venta { get; set; }
    public DateTime Fecha { get; set; }
    public decimal Monto { get; set; }
    public string MetodoPago { get; set; } = "EFECTIVO";
    public string? Observacion { get; set; }
    public int UsuarioId { get; set; }
    public int? AsientoId { get; set; }
}
