namespace ERP.API.Dtos;

public class RegistrarCompraDto
{
    public int ProveedorId { get; set; }
    public int UsuarioId { get; set; }
    public DateTime Fecha { get; set; }
    public string TipoDocumento { get; set; } = string.Empty;
    public string Serie { get; set; } = string.Empty;
    public string NumeroDocumento { get; set; } = string.Empty;
    public string? Moneda { get; set; }
    public string? Observacion { get; set; }
    public List<RegistrarCompraDetalleDto> Detalles { get; set; } = new();
}

public class RegistrarCompraDetalleDto
{
    public int ProductoId { get; set; }
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
}
