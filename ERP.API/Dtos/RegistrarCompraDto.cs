public class RegistrarCompraDto
{
    public int ProveedorId { get; set; }
    public int UsuarioId { get; set; }
    public DateTime Fecha { get; set; }
    public string TipoDocumento { get; set; } = string.Empty;
    public string Serie { get; set; } = string.Empty;
    public string NumeroDocumento { get; set; } = string.Empty;
    public string? Observacion { get; set; }
    public List<RegistrarCompraDetalleDto> Detalles { get; set; }
        = new();
}
