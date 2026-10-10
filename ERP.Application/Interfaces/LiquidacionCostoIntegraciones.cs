using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ERP.Application.Interfaces
{
    // =========================================================================
    // Compras: LC_LiquidacionCompra y LC_LiquidacionCostoDetalle no guardan
    // nombre de proveedor/documento (verificado contra el esquema real), así
    // que estos datos de presentación se resuelven en lectura contra los
    // módulos de Compras y Proveedores a través de estas interfaces.
    // =========================================================================

    public class CompraResumenDto
    {
        public int CompraId { get; set; }
        public string Proveedor { get; set; } = string.Empty;
        public string Documento { get; set; } = string.Empty;
        public decimal Total { get; set; }
    }

    /// <summary>Línea de compra (por producto) usada como base de distribución.</summary>
    public class CompraLineaDto
    {
        public long CompraDetalleId { get; set; }
        public int CompraId { get; set; }
        public long ProductoId { get; set; }
        public string ProductoNombre { get; set; } = string.Empty;
        public decimal Cantidad { get; set; }
        public decimal CostoUnitario { get; set; }

        /// <summary>Valor de la línea en moneda local (base del método VALOR).</summary>
        public decimal ValorLinea { get; set; }

        /// <summary>Peso total de la línea, p. ej. Kg (base del método PESO).</summary>
        public decimal PesoTotal { get; set; }

        /// <summary>Volumen total de la línea, p. ej. m3 (base del método VOLUMEN).</summary>
        public decimal VolumenTotal { get; set; }
    }

    public interface ICompraLandedCostDataProvider
    {
        /// <summary>Resumen de cabecera de una compra, usado al crear la liquidación.</summary>
        Task<CompraResumenDto?> ObtenerResumenAsync(int compraId);

        /// <summary>Resumen de cabecera de varias compras en lote, usado al leer/listar liquidaciones.</summary>
        Task<List<CompraResumenDto>> ObtenerResumenesAsync(IEnumerable<int> compraIds);

        /// <summary>Líneas de producto de una o más compras, usadas al calcular la distribución.</summary>
        Task<List<CompraLineaDto>> ObtenerLineasAsync(IEnumerable<int> compraIds);
    }

    // =========================================================================
    // Proveedores
    // =========================================================================

    public interface IProveedorConsultaService
    {
        /// <summary>Devuelve la razón social del proveedor, o null si no existe.</summary>
        Task<string?> ObtenerNombreAsync(int proveedorId);

        /// <summary>Devuelve la razón social de varios proveedores en lote (clave = ProveedorId).</summary>
        Task<Dictionary<int, string>> ObtenerNombresAsync(IEnumerable<int> proveedorIds);
    }

    // =========================================================================
    // Productos: LC_LiquidacionDistribucion no guarda el nombre del producto.
    // =========================================================================

    public interface IProductoConsultaService
    {
        /// <summary>Devuelve el nombre de varios productos en lote (clave = ProductoId).</summary>
        Task<Dictionary<long, string>> ObtenerNombresAsync(IEnumerable<long> productoIds);
    }

    // =========================================================================
    // Inventario / Kardex
    // sp_LC_RevalorizarCostoPromedio hace TODO en un solo paso: calcula el
    // nuevo costo promedio (CostoAnterior + CostoAsignado/StockActual) y lo
    // aplica vía sp_MovimientoInventario (tipo AJUSTE_COSTO, cantidad 0), lo
    // que ya deja registro en Kardex/KardexDetalle/MovimientosInventario y
    // sincroniza Productos.Stock. Por eso ya no se necesita un IKardexService
    // aparte ni una consulta previa de stock: todo queda encapsulado en el proc.
    // =========================================================================

    public class RevaluacionResultadoDto
    {
        public long ProductoId { get; set; }
        public decimal CostoPromedioAnterior { get; set; }
        public decimal CostoPromedioNuevo { get; set; }
        public decimal StockActual { get; set; }
        public long? MovimientoId { get; set; }
    }

    public interface IInventarioRevaluacionService
    {
        /// <summary>
        /// Revaloriza UN producto llamando a dbo.sp_LC_RevalorizarCostoPromedio.
        /// <paramref name="costoAsignado"/> es el monto total (todos los conceptos)
        /// asignado a ese producto por la liquidación; el proc se encarga de
        /// ponderarlo contra el stock físico vigente.
        /// </summary>
        Task<RevaluacionResultadoDto> RevalorizarAsync(
            long liquidacionCostoId, long productoId, int almacenId, decimal costoAsignado, int usuarioId);
    }

    // =========================================================================
    // Contabilidad: espejo en el libro mayor genérico (AsientoContable /
    // AsientoContableDetalle), igual que hacen Compras/Ventas, además del
    // registro específico en LC_LiquidacionAsiento / LC_LiquidacionAsientoDetalle.
    // =========================================================================

    public interface ICuentaContableLookupService
    {
        /// <summary>Resuelve el Id interno de una cuenta contable a partir de su código (p. ej. "201"), contra PlanCuentas.</summary>
        Task<int> ObtenerIdPorCodigoAsync(string codigo);
    }

    public record LineaAsientoContableDto(int CuentaId, decimal Debe, decimal Haber, string? Glosa);

    public interface IAsientoContableGeneralService
    {
        /// <summary>
        /// Inserta un asiento en las tablas genéricas AsientoContable/AsientoContableDetalle
        /// (fuera del motor de ReglasContables, que no admite montos dinámicos por concepto)
        /// y devuelve el Id generado en AsientoContable.
        /// </summary>
        Task<int> RegistrarAsientoAsync(
            DateTime fecha, string tipoOperacion, long referenciaId, string? glosa,
            decimal totalDebe, decimal totalHaber, int? usuarioId,
            IEnumerable<LineaAsientoContableDto> detalles);
    }
}
