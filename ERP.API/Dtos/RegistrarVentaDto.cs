namespace ERP.API.Dtos;

public class RegistrarVentaDto
{
    public int ClienteId { get; set; }
    public int UsuarioId { get; set; }
    public DateTime Fecha { get; set; }
    public string TipoDocumento { get; set; } = string.Empty;
    public string Serie { get; set; } = string.Empty;
    public string NumeroDocumento { get; set; } = string.Empty;
    public string? MetodoPago { get; set; }
    public string? Observacion { get; set; }
    public List<RegistrarVentaDetalleDto> Detalles { get; set; } = new();
}

public class RegistrarVentaDetalleDto
{
    public int ProductoId { get; set; }
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
}
