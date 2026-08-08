namespace ERP.Application.DTOs;

public class ProductoBusquedaDTO
{
    public int Id { get; set; }

    public string Codigo { get; set; } = string.Empty;

    public string Descripcion { get; set; } = string.Empty;

    public string Marca { get; set; } = string.Empty;

    public string Categoria { get; set; } = string.Empty;

    public int Stock { get; set; }

    public decimal PrecioVenta { get; set; }

    public decimal PrecioCompra { get; set; }

    public int StockMinimo { get; set; }
}