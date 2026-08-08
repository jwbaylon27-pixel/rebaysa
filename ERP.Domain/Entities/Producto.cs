namespace ERP.Domain.Entities;

public class Producto
{
    public int Id { get; set; } 
    public int CategoriaId { get; set; }
    public int MarcaId { get; set; }

    public string Codigo { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? UnidadMedida { get; set; }

    public decimal PrecioCompra { get; set; }
    public decimal PrecioVenta { get; set; }

    public int StockMinimo { get; set; }
    public decimal? Stock { get; set; }

    public bool Activo { get; set; } = true;
}