using ERP.Application.DTOs.Kardex;

namespace ERP.Application.Interfaces;

public interface IKardexRepository
{
    Task<KardexResumenDto> ObtenerResumenProducto(
        int productoId,
        int almacenId);

    Task<IEnumerable<KardexMovimientoDto>> ListarMovimientos(
        KardexFiltroDto filtro);

    Task<KardexDetalleDto?> ObtenerDetalleMovimiento(
        long movimientoId);

    Task<IEnumerable<ProductoBusquedaDto>> BuscarProductos(
        string texto);

    Task<IEnumerable<AlmacenDto>> ListarAlmacenes();

    Task<IEnumerable<TipoMovimientoDto>> ListarTiposMovimiento();

}