namespace ERP.Application.DTOs.Kardex;

public class KardexMovimientoDto
{
    public long Id { get; set; }
    public int ProductoId { get; set; }
    public string CodigoProducto { get; set; } = "";
    public string Producto { get; set; } = "";
    public int AlmacenId { get; set; }
    public string Almacen { get; set; } = "";
    public string TipoMovimiento { get; set; } = "";
    public string Documento { get; set; } = "";
    public int? DocumentoId { get; set; }
    public int Entrada { get; set; }
    public int Salida { get; set; }
    public int StockAnterior { get; set; }
    public int StockActual { get; set; }
    public decimal CostoUnitario { get; set; }
    public decimal CostoTotal { get; set; }
    public DateTime Fecha { get; set; }
    public int? UsuarioId { get; set; }
    public string Usuario { get; set; } = "";
}