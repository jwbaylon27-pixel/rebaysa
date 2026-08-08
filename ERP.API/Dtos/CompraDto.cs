public class CompraDto
{
    public int ProveedorId { get; set; }
    public int UsuarioId { get; set; }
    public DateTime Fecha { get; set; }
    public string TipoDocumento { get; set; }
    public string Serie { get; set; }
    public string NumeroDocumento { get; set; }
    public decimal SubTotal { get; set; }
    public decimal IGV { get; set; }
    public decimal Total { get; set; }
    public string Observacion { get; set; }
    public string Estado { get; set; }
    public List<CompraDetalleDto> Productos { get; set; }
}

public class CompraDetalleDto
{
    public int ProductoId { get; set; }
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
    public decimal Total { get; set; }
}
