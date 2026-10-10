namespace ERP.API.Dtos;

// Factura de venta a crédito pendiente (o parcialmente pagada)
public record VentaPendienteDto(
    int VentaId,
    DateTime Fecha,
    string TipoDocumento,
    string Serie,
    string NumeroDocumento,
    int ClienteId,
    string Cliente,
    decimal Total,
    decimal MontoPagado,
    decimal SaldoPendiente,
    int? DiasCredito,
    DateTime? FechaVencimiento,
    int DiasVencido // negativo = aun no vence, 0+ = dias de atraso
);

public record PagoVentaDto(
    int Id,
    int VentaId,
    DateTime Fecha,
    decimal Monto,
    string MetodoPago,
    string? Observacion,
    int? AsientoId
);

public class RegistrarPagoVentaDto
{
    public decimal Monto { get; set; }
    public string MetodoPago { get; set; } = "EFECTIVO"; // EFECTIVO | TRANSFERENCIA
    public DateTime? Fecha { get; set; }
    public string? Observacion { get; set; }
    public int? UsuarioId { get; set; }
}
