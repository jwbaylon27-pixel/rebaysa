namespace ERP.API.Dtos;

public class RegistrarMovimientoComercialDto
{
    public int? UsuarioId { get; set; }
    public int SocioId { get; set; }
    public string? TipoDocumento { get; set; }
    public string? Serie { get; set; }
    public string? NumeroDocumento { get; set; }
    public string? Observacion { get; set; }

    // Nueva propiedad: lista de detalles
    public List<RegistrarDetalleDto> Detalles { get; set; } = new();
}

public class RegistrarDetalleDto
{
    public int ProductoId { get; set; }
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
}


public record MovimientoComercialDto(
    int Id,
    DateTime Fecha,
    int SocioId,
    string Socio,
    IReadOnlyCollection<MovimientoDetalleDto> Detalles,
    decimal SubTotal,
    decimal IGV,
    decimal Total,
    string Estado
);

public record MovimientoDetalleDto(
    int Id,
    int ProductoId,
    string Producto,
    int Cantidad,
    decimal PrecioUnitario,
    decimal Total
);
