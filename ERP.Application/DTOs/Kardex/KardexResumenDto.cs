namespace ERP.Application.DTOs.Kardex;

public class KardexResumenDto
{
    public int ProductoId { get; set; }
    public string Codigo { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public decimal StockActual { get; set; }
    public decimal CostoPromedio { get; set; }
    public decimal ValorInventario { get; set; }
    public decimal Entradas { get; set; }
    public decimal Salidas { get; set; }
    public string Almacen { get; set; } = "";
}
