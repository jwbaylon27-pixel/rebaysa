using ERP.Domain.Entities;

namespace ERP.Application.Interfaces;

public interface IProductoRepository
{
    Task<List<Producto>> ListarAsync();
    Task<Producto?> ObtenerAsync(int id);
    Task<int> CrearAsync(Producto producto);
    Task ActualizarAsync(Producto producto);
    Task EliminarAsync(int id);
}