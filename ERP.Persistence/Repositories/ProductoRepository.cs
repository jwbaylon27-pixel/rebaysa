using ERP.Application.Interfaces;
using ERP.Domain.Entities;
using ERP.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace ERP.Persistence.Repositories;

public class ProductoRepository : IProductoRepository
{
    private readonly ApplicationDbContext _context;

    public ProductoRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<Producto>> ListarAsync()
    {
        return await _context.Productos
            .Where(x => x.Activo)
            .ToListAsync();
    }

    public async Task<Producto?> ObtenerAsync(int id)
    {
        return await _context.Productos
            .FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<int> CrearAsync(Producto producto)
    {
        _context.Productos.Add(producto);
        await _context.SaveChangesAsync();

        return producto.Id;
    }

    public async Task ActualizarAsync(Producto producto)
    {
        _context.Productos.Update(producto);
        await _context.SaveChangesAsync();
    }

    public async Task EliminarAsync(int id)
    {
        var producto = await _context.Productos.FindAsync(id);

        if (producto == null)
            return;

        producto.Activo = false;

        await _context.SaveChangesAsync();
    }
}