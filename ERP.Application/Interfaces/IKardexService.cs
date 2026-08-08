using ERP.Application.DTOs.Kardex;

namespace ERP.Application.Interfaces;

public interface IKardexService
{
    //=====================================================
    // RESUMEN DEL PRODUCTO
    //=====================================================

    Task<KardexResumenDto> ObtenerResumenProductoAsync(
        int productoId,
        int almacenId);

    //=====================================================
    // LISTADO DE MOVIMIENTOS
    //=====================================================

    Task<IEnumerable<KardexMovimientoDto>> ListarMovimientosAsync(
        KardexFiltroDto filtro);

    //=====================================================
    // DETALLE DE UN MOVIMIENTO
    //=====================================================

    Task<KardexDetalleDto?> ObtenerDetalleMovimientoAsync(
        long movimientoId);

    //=====================================================
    // AUTOCOMPLETE PRODUCTOS
    //=====================================================

    Task<IEnumerable<ProductoBusquedaDto>> BuscarProductosAsync(
        string texto);

    //=====================================================
    // CATÁLOGOS
    //=====================================================

    Task<IEnumerable<AlmacenDto>> ListarAlmacenesAsync();

    Task<IEnumerable<TipoMovimientoDto>> ListarTiposMovimientoAsync();

    //=====================================================
    // EXPORTACIONES
    //=====================================================

    Task<byte[]> ExportarExcelAsync(
        KardexFiltroDto filtro);

    Task<byte[]> ExportarPdfAsync(
        KardexFiltroDto filtro);
}