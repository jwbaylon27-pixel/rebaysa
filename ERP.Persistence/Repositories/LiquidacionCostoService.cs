using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

using ERP.Application.DTOs;
using ERP.Application.Interfaces;
using ERP.Domain.Entities;
using ERP.Persistence.Context; // ApplicationDbContext

namespace ERP.Persistence.Repositories
{
    /// <summary>
    /// Implementación EF Core de <see cref="ILiquidacionCostoService"/>, operando directamente
    /// sobre las 8 tablas del módulo. Los datos de presentación que NO están en estas tablas
    /// (nombre de proveedor, nombre de producto, datos de la compra, stock actual) se resuelven
    /// en lectura contra las interfaces de integración inyectadas.
    /// </summary>
    public class LiquidacionCostoService : ILiquidacionCostoService
    {
        private readonly ApplicationDbContext _context;
        private readonly ICompraLandedCostDataProvider _comprasProvider;
        private readonly IProveedorConsultaService _proveedorService;
        private readonly IProductoConsultaService _productoService;
        private readonly ICuentaContableLookupService _cuentaContableService;
        private readonly IAsientoContableGeneralService _asientoContableGeneral;
        private readonly IInventarioRevaluacionService _inventarioService;
        private readonly ILogger<LiquidacionCostoService> _logger;

        public LiquidacionCostoService(
            ApplicationDbContext context,
            ICompraLandedCostDataProvider comprasProvider,
            IProveedorConsultaService proveedorService,
            IProductoConsultaService productoService,
            ICuentaContableLookupService cuentaContableService,
            IAsientoContableGeneralService asientoContableGeneral,
            IInventarioRevaluacionService inventarioService,
            ILogger<LiquidacionCostoService> logger)
        {
            _context = context;
            _comprasProvider = comprasProvider;
            _proveedorService = proveedorService;
            _productoService = productoService;
            _cuentaContableService = cuentaContableService;
            _asientoContableGeneral = asientoContableGeneral;
            _inventarioService = inventarioService;
            _logger = logger;
        }

        // =====================================================================
        // CATÁLOGOS
        // =====================================================================

        public async Task<List<MetodoDistribucionDto>> ObtenerMetodosDistribucionAsync()
        {
            return await _context.MetodosDistribucion
                .Where(m => m.Activo)
                .OrderBy(m => m.MetodoDistribucionId)
                .Select(m => new MetodoDistribucionDto(m.MetodoDistribucionId, m.Codigo, m.Nombre, m.Descripcion))
                .ToListAsync();
        }

        public async Task<List<TipoCostoDto>> ObtenerTiposCostoAsync()
        {
            return await _context.TiposCosto
                .Include(t => t.MetodoDistribucion)
                .Where(t => t.Activo)
                .OrderBy(t => t.TipoCostoId)
                .Select(t => new TipoCostoDto(
                    t.TipoCostoId, t.Codigo, t.Nombre, t.Descripcion,
                    t.MetodoDistribucionId,
                    t.MetodoDistribucion!.Codigo,
                    t.MetodoDistribucion.Nombre))
                .ToListAsync();
        }

        // =====================================================================
        // CONSULTA
        // =====================================================================

        public async Task<List<LiquidacionCostoDto>> ListarAsync(
            string? estado, int? almacenId, DateTime? fechaDesde, DateTime? fechaHasta, string? numero)
        {
            var query = QueryConIncludes();

            if (!string.IsNullOrWhiteSpace(estado))
                query = query.Where(l => l.Estado == estado.Trim().ToUpperInvariant());

            if (almacenId.HasValue)
                query = query.Where(l => l.AlmacenId == almacenId);

            if (fechaDesde.HasValue)
                query = query.Where(l => l.Fecha >= fechaDesde.Value);

            if (fechaHasta.HasValue)
                query = query.Where(l => l.Fecha <= fechaHasta.Value);

            if (!string.IsNullOrWhiteSpace(numero))
                query = query.Where(l => l.Numero.Contains(numero));

            var entidades = await query
                .OrderByDescending(l => l.Fecha)
                .ThenByDescending(l => l.LiquidacionCostoId)
                .ToListAsync();

            // MapToDtoAsync resuelve proveedor/documento de compra en lote antes de armar cada DTO.
            var result = new List<LiquidacionCostoDto>(entidades.Count);
            foreach (var entity in entidades)
                result.Add(await MapToDtoAsync(entity));

            return result;
        }

        public async Task<LiquidacionCostoDto?> ObtenerPorIdAsync(long id)
        {
            var entity = await QueryConIncludes().FirstOrDefaultAsync(l => l.LiquidacionCostoId == id);
            return entity == null ? null : await MapToDtoAsync(entity);
        }

        private IQueryable<LiquidacionCosto> QueryConIncludes() =>
            _context.LiquidacionesCosto
                .Include(l => l.Compras)
                .Include(l => l.Costos).ThenInclude(c => c.TipoCosto)
                .Include(l => l.Costos).ThenInclude(c => c.MetodoDistribucion)
                .AsQueryable();

        // =====================================================================
        // CREACIÓN / ANULACIÓN
        // =====================================================================

        public async Task<LiquidacionCostoDto> CrearAsync(CrearLiquidacionDto dto, int usuarioId)
        {
            var numeroExiste = await _context.LiquidacionesCosto.AnyAsync(l => l.Numero == dto.Numero);
            if (numeroExiste)
                throw new InvalidOperationException($"Ya existe una liquidación de costo con el número '{dto.Numero}'.");

            var compraIds = dto.CompraIds.Distinct().ToList();
            var resumenes = await _comprasProvider.ObtenerResumenesAsync(compraIds);
            var resumenPorId = resumenes.ToDictionary(r => r.CompraId);

            var compras = new List<LiquidacionCompra>();
            decimal totalMercaderia = 0m;
            var fechaRegistro = DateTime.UtcNow;

            foreach (var compraId in compraIds)
            {
                if (!resumenPorId.TryGetValue(compraId, out var resumen))
                    throw new InvalidOperationException($"No se encontró la compra con Id {compraId}.");

                totalMercaderia += resumen.Total;
                compras.Add(new LiquidacionCompra
                {
                    CompraId = resumen.CompraId,
                    TotalCompra = resumen.Total,
                    FechaRegistro = fechaRegistro
                });
            }

            var entity = new LiquidacionCosto
            {
                Numero = dto.Numero,
                Fecha = dto.Fecha ?? DateTime.UtcNow,
                AlmacenId = dto.AlmacenId,
                MonedaCodigo = string.IsNullOrWhiteSpace(dto.MonedaCodigo) ? "PEN" : dto.MonedaCodigo!,
                TipoCambio = dto.TipoCambio ?? 1m,
                Estado = EstadosLiquidacion.Borrador,
                TotalMercaderia = totalMercaderia,
                TotalCostos = 0m,
                TotalLiquidacion = totalMercaderia,
                Observacion = dto.Observacion,
                UsuarioCreacionId = dto.UsuarioId ?? usuarioId,
                FechaCreacion = fechaRegistro,
                Compras = compras
            };

            _context.LiquidacionesCosto.Add(entity);
            await _context.SaveChangesAsync();

            return await MapToDtoAsync(entity);
        }

        public async Task<bool> AnularAsync(long id, int usuarioId)
        {
            var entity = await _context.LiquidacionesCosto.FirstOrDefaultAsync(l => l.LiquidacionCostoId == id);
            if (entity == null)
                return false;

            if (entity.Estado == EstadosLiquidacion.Confirmado)
                return false;

            entity.Estado = EstadosLiquidacion.Anulado;
            entity.UsuarioModificacionId = usuarioId;
            entity.FechaModificacion = DateTime.UtcNow;

            _context.LiquidacionDistribuciones.RemoveRange(
                _context.LiquidacionDistribuciones.Where(d => d.LiquidacionCostoId == id));

            await _context.SaveChangesAsync();
            return true;
        }

        // =====================================================================
        // CONCEPTOS DE COSTO
        // =====================================================================

        public async Task<LiquidacionCostoDetalleDto> AgregarCostoAsync(long liquidacionId, AgregarCostoDto dto)
        {
            var liquidacion = await _context.LiquidacionesCosto
                .FirstOrDefaultAsync(l => l.LiquidacionCostoId == liquidacionId);

            if (liquidacion == null)
                throw new InvalidOperationException($"No se encontró la liquidación de costo con Id {liquidacionId}.");

            if (liquidacion.Estado == EstadosLiquidacion.Confirmado || liquidacion.Estado == EstadosLiquidacion.Anulado)
                throw new InvalidOperationException($"No se pueden agregar costos a una liquidación en estado {liquidacion.Estado}.");

            var tipoCosto = await _context.TiposCosto
                .Include(t => t.MetodoDistribucion)
                .FirstOrDefaultAsync(t => t.TipoCostoId == dto.TipoCostoId && t.Activo);

            if (tipoCosto == null)
                throw new InvalidOperationException($"El tipo de costo con Id {dto.TipoCostoId} no existe o está inactivo.");

            var metodoDistribucion = await ResolverMetodoDistribucionAsync(dto.MetodoDistribucionId, tipoCosto);

            var monedaCodigo = string.IsNullOrWhiteSpace(dto.MonedaCodigo) ? liquidacion.MonedaCodigo : dto.MonedaCodigo!;
            var tipoCambio = dto.TipoCambio ?? (monedaCodigo == liquidacion.MonedaCodigo ? 1m : liquidacion.TipoCambio);
            var importeBase = dto.Importe * tipoCambio;

            var detalle = new LiquidacionCostoDetalle
            {
                LiquidacionCostoId = liquidacionId,
                TipoCostoId = tipoCosto.TipoCostoId,
                ProveedorId = dto.ProveedorId,
                TipoDocumento = dto.TipoDocumento,
                Serie = dto.Serie,
                NumeroDocumento = dto.NumeroDocumento,
                FechaDocumento = dto.FechaDocumento,
                Importe = dto.Importe,
                MonedaCodigo = monedaCodigo,
                TipoCambio = tipoCambio,
                ImporteBase = importeBase,
                MetodoDistribucionId = metodoDistribucion.MetodoDistribucionId,
                CuentaContableId = dto.CuentaContableId,
                Observacion = dto.Observacion
            };

            _context.LiquidacionCostoDetalles.Add(detalle);

            liquidacion.TotalCostos += importeBase;
            liquidacion.TotalLiquidacion = liquidacion.TotalMercaderia + liquidacion.TotalCostos;
            InvalidarCalculoSiExiste(liquidacion);

            await _context.SaveChangesAsync();

            var proveedorNombre = dto.ProveedorId.HasValue
                ? await _proveedorService.ObtenerNombreAsync(dto.ProveedorId.Value)
                : null;

            return MapCostoDetalleToDto(detalle, tipoCosto.Nombre, metodoDistribucion.Codigo, proveedorNombre);
        }

        public async Task<LiquidacionCostoDetalleDto?> ActualizarCostoAsync(long liquidacionId, long costoDetalleId, AgregarCostoDto dto)
        {
            var detalle = await _context.LiquidacionCostoDetalles
                .Include(d => d.LiquidacionCosto)
                .FirstOrDefaultAsync(d => d.LiquidacionCostoDetalleId == costoDetalleId && d.LiquidacionCostoId == liquidacionId);

            if (detalle == null || detalle.LiquidacionCosto == null)
                return null;

            var liquidacion = detalle.LiquidacionCosto;
            if (liquidacion.Estado == EstadosLiquidacion.Confirmado || liquidacion.Estado == EstadosLiquidacion.Anulado)
                return null;

            var tipoCosto = await _context.TiposCosto
                .Include(t => t.MetodoDistribucion)
                .FirstOrDefaultAsync(t => t.TipoCostoId == dto.TipoCostoId && t.Activo);

            if (tipoCosto == null)
                throw new InvalidOperationException($"El tipo de costo con Id {dto.TipoCostoId} no existe o está inactivo.");

            var metodoDistribucion = await ResolverMetodoDistribucionAsync(dto.MetodoDistribucionId, tipoCosto);

            var monedaCodigo = string.IsNullOrWhiteSpace(dto.MonedaCodigo) ? liquidacion.MonedaCodigo : dto.MonedaCodigo!;
            var tipoCambio = dto.TipoCambio ?? (monedaCodigo == liquidacion.MonedaCodigo ? 1m : liquidacion.TipoCambio);
            var nuevoImporteBase = dto.Importe * tipoCambio;

            liquidacion.TotalCostos += nuevoImporteBase - detalle.ImporteBase;
            liquidacion.TotalLiquidacion = liquidacion.TotalMercaderia + liquidacion.TotalCostos;
            InvalidarCalculoSiExiste(liquidacion);

            detalle.TipoCostoId = tipoCosto.TipoCostoId;
            detalle.ProveedorId = dto.ProveedorId;
            detalle.TipoDocumento = dto.TipoDocumento;
            detalle.Serie = dto.Serie;
            detalle.NumeroDocumento = dto.NumeroDocumento;
            detalle.FechaDocumento = dto.FechaDocumento;
            detalle.Importe = dto.Importe;
            detalle.MonedaCodigo = monedaCodigo;
            detalle.TipoCambio = tipoCambio;
            detalle.ImporteBase = nuevoImporteBase;
            detalle.MetodoDistribucionId = metodoDistribucion.MetodoDistribucionId;
            detalle.CuentaContableId = dto.CuentaContableId;
            detalle.Observacion = dto.Observacion;

            await _context.SaveChangesAsync();

            var proveedorNombre = dto.ProveedorId.HasValue
                ? await _proveedorService.ObtenerNombreAsync(dto.ProveedorId.Value)
                : null;

            return MapCostoDetalleToDto(detalle, tipoCosto.Nombre, metodoDistribucion.Codigo, proveedorNombre);
        }

        public async Task<bool> EliminarCostoAsync(long liquidacionId, long costoDetalleId)
        {
            var detalle = await _context.LiquidacionCostoDetalles
                .Include(d => d.LiquidacionCosto)
                .FirstOrDefaultAsync(d => d.LiquidacionCostoDetalleId == costoDetalleId && d.LiquidacionCostoId == liquidacionId);

            if (detalle == null || detalle.LiquidacionCosto == null)
                return false;

            var liquidacion = detalle.LiquidacionCosto;
            if (liquidacion.Estado == EstadosLiquidacion.Confirmado || liquidacion.Estado == EstadosLiquidacion.Anulado)
                return false;

            liquidacion.TotalCostos -= detalle.ImporteBase;
            liquidacion.TotalLiquidacion = liquidacion.TotalMercaderia + liquidacion.TotalCostos;
            InvalidarCalculoSiExiste(liquidacion);

            _context.LiquidacionCostoDetalles.Remove(detalle);
            await _context.SaveChangesAsync();
            return true;
        }

        private void InvalidarCalculoSiExiste(LiquidacionCosto liquidacion)
        {
            if (liquidacion.Estado == EstadosLiquidacion.Calculado)
            {
                liquidacion.Estado = EstadosLiquidacion.Borrador;
                _context.LiquidacionDistribuciones.RemoveRange(
                    _context.LiquidacionDistribuciones.Where(d => d.LiquidacionCostoId == liquidacion.LiquidacionCostoId));
            }

            liquidacion.FechaModificacion = DateTime.UtcNow;
        }

        private async Task<MetodoDistribucion> ResolverMetodoDistribucionAsync(int? metodoDistribucionIdSolicitado, TipoCosto tipoCosto)
        {
            if (!metodoDistribucionIdSolicitado.HasValue || metodoDistribucionIdSolicitado == tipoCosto.MetodoDistribucionId)
                return tipoCosto.MetodoDistribucion!;

            var metodo = await _context.MetodosDistribucion
                .FirstOrDefaultAsync(m => m.MetodoDistribucionId == metodoDistribucionIdSolicitado && m.Activo);

            if (metodo == null)
                throw new InvalidOperationException($"El método de distribución con Id {metodoDistribucionIdSolicitado} no existe o está inactivo.");

            return metodo;
        }

        // =====================================================================
        // CÁLCULO DE DISTRIBUCIÓN (5 MÉTODOS)
        // =====================================================================

        public async Task<ResultadoCalculoDto> CalcularAsync(long liquidacionId, CalcularLiquidacionDto dto)
        {
            var liquidacion = await _context.LiquidacionesCosto
                .Include(l => l.Compras)
                .Include(l => l.Costos).ThenInclude(c => c.TipoCosto)
                .Include(l => l.Costos).ThenInclude(c => c.MetodoDistribucion)
                .FirstOrDefaultAsync(l => l.LiquidacionCostoId == liquidacionId);

            if (liquidacion == null)
                throw new InvalidOperationException($"No se encontró la liquidación de costo con Id {liquidacionId}.");

            if (liquidacion.Estado == EstadosLiquidacion.Confirmado)
                throw new InvalidOperationException("La liquidación ya fue confirmada; la distribución no puede recalcularse.");

            if (liquidacion.Estado == EstadosLiquidacion.Anulado)
                throw new InvalidOperationException("No se puede calcular una liquidación anulada.");

            if (liquidacion.Costos.Count == 0)
                throw new InvalidOperationException("La liquidación no tiene conceptos de costo registrados para distribuir.");

            var compraIds = liquidacion.Compras.Select(c => c.CompraId).ToList();
            var lineas = await _comprasProvider.ObtenerLineasAsync(compraIds);

            if (lineas.Count == 0)
                throw new InvalidOperationException("No se encontraron líneas de compra para distribuir los costos.");

            var totalValor = lineas.Sum(l => l.ValorLinea);
            var totalCantidad = lineas.Sum(l => l.Cantidad);
            var totalPeso = lineas.Sum(l => l.PesoTotal);
            var totalVolumen = lineas.Sum(l => l.VolumenTotal);

            _context.LiquidacionDistribuciones.RemoveRange(
                _context.LiquidacionDistribuciones.Where(d => d.LiquidacionCostoId == liquidacionId));

            var nuevasDistribuciones = new List<LiquidacionDistribucion>();

            foreach (var costo in liquidacion.Costos)
            {
                var metodoCodigo = (costo.MetodoDistribucion?.Codigo
                    ?? throw new InvalidOperationException($"El concepto '{costo.TipoCosto?.Nombre}' no tiene un método de distribución válido."))
                    .ToUpperInvariant();

                Dictionary<long, decimal>? porcentajesManuales = null;

                switch (metodoCodigo)
                {
                    case MetodoDistribucionCodigos.Valor when totalValor <= 0:
                        throw new InvalidOperationException(
                            $"No es posible distribuir el concepto '{costo.TipoCosto?.Nombre}' por VALOR: las líneas de compra no registran valor.");

                    case MetodoDistribucionCodigos.Peso when totalPeso <= 0:
                        throw new InvalidOperationException(
                            $"No es posible distribuir el concepto '{costo.TipoCosto?.Nombre}' por PESO: las líneas de compra no registran peso.");

                    case MetodoDistribucionCodigos.Volumen when totalVolumen <= 0:
                        throw new InvalidOperationException(
                            $"No es posible distribuir el concepto '{costo.TipoCosto?.Nombre}' por VOLUMEN: las líneas de compra no registran volumen.");

                    case MetodoDistribucionCodigos.Cantidad when totalCantidad <= 0:
                        throw new InvalidOperationException(
                            $"No es posible distribuir el concepto '{costo.TipoCosto?.Nombre}' por CANTIDAD: las líneas de compra no registran cantidad.");

                    case MetodoDistribucionCodigos.Manual:
                        var grupo = dto.PorcentajesManuales?
                            .FirstOrDefault(p => p.LiquidacionCostoDetalleId == costo.LiquidacionCostoDetalleId);

                        if (grupo == null || grupo.Porcentajes.Count == 0)
                            throw new InvalidOperationException(
                                $"Faltan los porcentajes manuales para el concepto '{costo.TipoCosto?.Nombre}'.");

                        var suma = grupo.Porcentajes.Sum(p => p.Porcentaje);
                        if (Math.Abs(suma - 100m) > 0.01m)
                            throw new InvalidOperationException(
                                $"Los porcentajes manuales del concepto '{costo.TipoCosto?.Nombre}' deben sumar 100% (suma actual: {suma}%).");

                        porcentajesManuales = grupo.Porcentajes.ToDictionary(p => p.CompraDetalleId, p => p.Porcentaje);
                        break;
                }

                foreach (var linea in lineas)
                {
                    decimal baseDistribucion;
                    decimal porcentaje;

                    switch (metodoCodigo)
                    {
                        case MetodoDistribucionCodigos.Valor:
                            baseDistribucion = linea.ValorLinea;
                            porcentaje = (linea.ValorLinea / totalValor) * 100m;
                            break;
                        case MetodoDistribucionCodigos.Cantidad:
                            baseDistribucion = linea.Cantidad;
                            porcentaje = (linea.Cantidad / totalCantidad) * 100m;
                            break;
                        case MetodoDistribucionCodigos.Peso:
                            baseDistribucion = linea.PesoTotal;
                            porcentaje = (linea.PesoTotal / totalPeso) * 100m;
                            break;
                        case MetodoDistribucionCodigos.Volumen:
                            baseDistribucion = linea.VolumenTotal;
                            porcentaje = (linea.VolumenTotal / totalVolumen) * 100m;
                            break;
                        case MetodoDistribucionCodigos.Manual:
                            baseDistribucion = 0m;
                            porcentaje = porcentajesManuales != null && porcentajesManuales.TryGetValue(linea.CompraDetalleId, out var p) ? p : 0m;
                            break;
                        default:
                            throw new InvalidOperationException($"Método de distribución '{metodoCodigo}' no soportado.");
                    }

                    var costoAsignado = costo.ImporteBase * (porcentaje / 100m);

                    nuevasDistribuciones.Add(new LiquidacionDistribucion
                    {
                        LiquidacionCostoId = liquidacionId,
                        LiquidacionCostoDetalleId = costo.LiquidacionCostoDetalleId,
                        CompraId = linea.CompraId,
                        CompraDetalleId = linea.CompraDetalleId,
                        ProductoId = linea.ProductoId,
                        Cantidad = linea.Cantidad,
                        CostoCompraUnitario = linea.CostoUnitario,
                        ValorCompra = linea.ValorLinea,
                        Peso = linea.PesoTotal,
                        Volumen = linea.VolumenTotal,
                        BaseDistribucion = baseDistribucion,
                        PorcentajeDistribucion = porcentaje,
                        CostoAsignado = costoAsignado
                    });
                }
            }

            // Segunda pasada: CostoUnitarioAdicional/CostoUnitarioFinal se calculan agregando
            // TODOS los conceptos de una misma línea de compra, y se replican en cada fila
            // de esa línea (evita tener que agregar en cada lectura posterior).
            foreach (var grupoLinea in nuevasDistribuciones.GroupBy(d => d.CompraDetalleId))
            {
                var totalAsignadoLinea = grupoLinea.Sum(d => d.CostoAsignado);
                var cantidad = grupoLinea.First().Cantidad;
                var costoCompraUnitario = grupoLinea.First().CostoCompraUnitario;
                var costoUnitarioAdicional = cantidad > 0 ? totalAsignadoLinea / cantidad : 0m;
                var costoUnitarioFinal = costoCompraUnitario + costoUnitarioAdicional;

                foreach (var fila in grupoLinea)
                {
                    fila.CostoUnitarioAdicional = costoUnitarioAdicional;
                    fila.CostoUnitarioFinal = costoUnitarioFinal;
                }
            }

            _context.LiquidacionDistribuciones.AddRange(nuevasDistribuciones);

            liquidacion.TotalCostos = liquidacion.Costos.Sum(c => c.ImporteBase);
            liquidacion.TotalLiquidacion = liquidacion.TotalMercaderia + liquidacion.TotalCostos;
            liquidacion.Estado = EstadosLiquidacion.Calculado;
            liquidacion.FechaModificacion = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var items = await ObtenerItemsCalculadosAsync(liquidacionId);
            return new ResultadoCalculoDto(liquidacionId, liquidacion.TotalMercaderia, liquidacion.TotalCostos, liquidacion.TotalLiquidacion, items);
        }

        public async Task<ResultadoCalculoDto?> ObtenerUltimoCalculoAsync(long liquidacionId)
        {
            var liquidacion = await _context.LiquidacionesCosto
                .FirstOrDefaultAsync(l => l.LiquidacionCostoId == liquidacionId);

            if (liquidacion == null)
                return null;

            if (liquidacion.Estado != EstadosLiquidacion.Calculado && liquidacion.Estado != EstadosLiquidacion.Confirmado)
                return null;

            var items = await ObtenerItemsCalculadosAsync(liquidacionId);
            if (items.Count == 0)
                return null;

            return new ResultadoCalculoDto(liquidacionId, liquidacion.TotalMercaderia, liquidacion.TotalCostos, liquidacion.TotalLiquidacion, items);
        }

        /// <summary>
        /// Reconstruye el resumen por producto (<see cref="ItemCalculadoDto"/>) a partir de las filas
        /// persistidas en <c>LiquidacionDistribucion</c> (una fila por combinación concepto x línea).
        /// El nombre del producto se resuelve en lote contra IProductoConsultaService, ya que no se
        /// persiste en la tabla.
        /// </summary>
        private async Task<List<ItemCalculadoDto>> ObtenerItemsCalculadosAsync(long liquidacionId)
        {
            var distribuciones = await _context.LiquidacionDistribuciones
                .Where(d => d.LiquidacionCostoId == liquidacionId)
                .ToListAsync();

            if (distribuciones.Count == 0)
                return new List<ItemCalculadoDto>();

            var productoIds = distribuciones.Select(d => d.ProductoId).Distinct().ToList();
            var nombresProducto = await _productoService.ObtenerNombresAsync(productoIds);

            // Paso 1: Cantidad/ValorCompra de cada línea se repiten en una fila por cada concepto;
            // se toma un único valor por línea para no duplicarlos al sumar por producto.
            var lineasUnicas = distribuciones
                .GroupBy(d => new { d.ProductoId, d.CompraDetalleId })
                .Select(g => new { g.Key.ProductoId, Cantidad = g.First().Cantidad, ValorCompra = g.First().ValorCompra })
                .ToList();

            var basePorProducto = lineasUnicas
                .GroupBy(x => x.ProductoId)
                .ToDictionary(g => g.Key, g => new { Cantidad = g.Sum(x => x.Cantidad), ValorCompra = g.Sum(x => x.ValorCompra) });

            // Paso 2: CostoAsignado sí es acumulable directamente entre conceptos (es dinero, no base).
            var asignadoPorProducto = distribuciones
                .GroupBy(d => d.ProductoId)
                .ToDictionary(g => g.Key, g => g.Sum(d => d.CostoAsignado));

            var items = basePorProducto
                .Select(kvp =>
                {
                    var productoId = kvp.Key;
                    var baseInfo = kvp.Value;
                    var costoTotalAsignado = asignadoPorProducto.TryGetValue(productoId, out var monto) ? monto : 0m;

                    var costoCompraUnitario = baseInfo.Cantidad > 0 ? baseInfo.ValorCompra / baseInfo.Cantidad : 0m;
                    var costoUnitarioAdicional = baseInfo.Cantidad > 0 ? costoTotalAsignado / baseInfo.Cantidad : 0m;

                    nombresProducto.TryGetValue(productoId, out var nombreProducto);

                    return new ItemCalculadoDto(
                        productoId,
                        nombreProducto ?? $"Producto {productoId}",
                        baseInfo.Cantidad,
                        costoCompraUnitario,
                        costoUnitarioAdicional,
                        costoCompraUnitario + costoUnitarioAdicional,
                        baseInfo.ValorCompra,
                        costoTotalAsignado);
                })
                .OrderBy(i => i.Producto)
                .ToList();

            return items;
        }

        // =====================================================================
        // CONFIRMACIÓN: ASIENTO CONTABLE + REVALORIZACIÓN DE INVENTARIO + KARDEX
        // =====================================================================

        public async Task<ResultadoConfirmacionDto> ConfirmarAsync(long liquidacionId, ConfirmarLiquidacionDto dto, int usuarioId)
        {
            var liquidacion = await _context.LiquidacionesCosto
                .Include(l => l.Costos).ThenInclude(c => c.TipoCosto)
                .FirstOrDefaultAsync(l => l.LiquidacionCostoId == liquidacionId);

            if (liquidacion == null)
                throw new InvalidOperationException($"No se encontró la liquidación de costo con Id {liquidacionId}.");

            if (liquidacion.Estado == EstadosLiquidacion.Confirmado)
                throw new InvalidOperationException("La liquidación de costo ya se encuentra confirmada.");

            if (liquidacion.Estado != EstadosLiquidacion.Calculado)
                throw new InvalidOperationException("Debe calcular la distribución de costos antes de confirmar la liquidación.");

            var costosSinCuenta = liquidacion.Costos.Where(c => !c.CuentaContableId.HasValue).ToList();
            if (costosSinCuenta.Count > 0)
            {
                var nombres = string.Join(", ", costosSinCuenta.Select(c => c.TipoCosto?.Nombre ?? c.TipoCostoId.ToString()));
                throw new InvalidOperationException($"Los siguientes conceptos de costo no tienen cuenta contable asignada: {nombres}.");
            }

            var items = await ObtenerItemsCalculadosAsync(liquidacionId);
            if (items.Count == 0)
                throw new InvalidOperationException("No hay una distribución de costos calculada para confirmar.");

            var cuentaMercaderiaId = dto.CuentaMercaderiaId ?? await _cuentaContableService.ObtenerIdPorCodigoAsync("201");
            var fechaConfirmacion = DateTime.UtcNow;

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var numeroAsiento = await GenerarNumeroAsientoAsync();

                var asiento = new LiquidacionAsiento
                {
                    LiquidacionCostoId = liquidacionId,
                    NumeroAsiento = numeroAsiento,
                    Fecha = fechaConfirmacion,
                    Glosa = $"Distribución de costos de importación - Liquidación {liquidacion.Numero}",
                    TotalDebe = liquidacion.TotalCostos,
                    TotalHaber = liquidacion.TotalCostos,
                    Estado = "GENERADO",
                    UsuarioId = dto.UsuarioId ?? usuarioId,
                    FechaCreacion = fechaConfirmacion
                };

                // Línea de débito: se carga el total de costos adicionales a la cuenta de mercadería/inventario.
                asiento.Detalles.Add(new LiquidacionAsientoDetalle
                {
                    Linea = 1,
                    CuentaContableId = cuentaMercaderiaId,
                    Descripcion = $"Costos de importación liquidación {liquidacion.Numero}",
                    Debe = liquidacion.TotalCostos,
                    Haber = 0m,
                    ProveedorId = null
                });

                // Líneas de crédito: una por cada concepto de costo, contra su cuenta y proveedor.
                var linea = 2;
                foreach (var costo in liquidacion.Costos)
                {
                    var referencia = string.Join(" ", new[] { costo.Serie, costo.NumeroDocumento }.Where(s => !string.IsNullOrWhiteSpace(s)));
                    asiento.Detalles.Add(new LiquidacionAsientoDetalle
                    {
                        Linea = linea++,
                        CuentaContableId = costo.CuentaContableId!.Value,
                        Descripcion = string.IsNullOrWhiteSpace(referencia)
                            ? costo.TipoCosto?.Nombre
                            : $"{costo.TipoCosto?.Nombre} {referencia}",
                        Debe = 0m,
                        Haber = costo.ImporteBase,
                        ProveedorId = costo.ProveedorId
                    });
                }

                _context.LiquidacionAsientos.Add(asiento);
                await _context.SaveChangesAsync(); // asigna AsientoId

                if (!liquidacion.AlmacenId.HasValue)
                    throw new InvalidOperationException("La liquidación no tiene un almacén asignado; no es posible revalorizar el inventario.");

                var almacenId = liquidacion.AlmacenId.Value;

                // Espejo en el libro mayor genérico (igual que Compras/Ventas vía sp_GenerarAsientoCompra),
                // para que la liquidación aparezca en los mismos reportes contables. No usa el motor de
                // ReglasContables porque este necesita un crédito dinámico por cada concepto de costo,
                // con su propia cuenta, algo que ese motor (limitado a SUBTOTAL/IGV/TOTAL/COSTO) no soporta.
                var lineasAsientoGeneral = asiento.Detalles
                    .Select(d => new LineaAsientoContableDto(d.CuentaContableId, d.Debe, d.Haber, d.Descripcion))
                    .ToList();

                var asientoContableId = await _asientoContableGeneral.RegistrarAsientoAsync(
                    fechaConfirmacion,
                    "LIQUIDACION_COSTO",
                    liquidacionId,
                    asiento.Glosa,
                    asiento.TotalDebe,
                    asiento.TotalHaber,
                    dto.UsuarioId ?? usuarioId,
                    lineasAsientoGeneral);

                _logger.LogInformation(
                    "Liquidación {LiquidacionId}: asiento LC {AsientoId} espejado en AsientoContable {AsientoContableId}.",
                    liquidacionId, asiento.AsientoId, asientoContableId);

                // Revalorización de inventario: una llamada por producto a sp_LC_RevalorizarCostoPromedio,
                // que calcula el nuevo costo promedio ponderado contra el stock físico vigente y deja
                // registro en Kardex/MovimientosInventario (vía sp_MovimientoInventario, AJUSTE_COSTO).
                var filasDistribucion = await _context.LiquidacionDistribuciones
                    .Where(d => d.LiquidacionCostoId == liquidacionId)
                    .ToListAsync();

                foreach (var item in items)
                {
                    var resultado = await _inventarioService.RevalorizarAsync(
                        liquidacionId, item.ProductoId, almacenId, item.CostoTotalAsignado, dto.UsuarioId ?? usuarioId);

                    if (resultado.StockActual <= 0)
                    {
                        _logger.LogWarning(
                            "El producto {ProductoId} no tiene stock físico en el almacén {AlmacenId}; " +
                            "su costo adicional (S/ {Monto}) no fue aplicado al costo promedio de inventario.",
                            item.ProductoId, almacenId, item.CostoTotalAsignado);
                    }

                    foreach (var fila in filasDistribucion.Where(f => f.ProductoId == item.ProductoId))
                    {
                        fila.CantidadStockActual = resultado.StockActual;
                        fila.CostoInventarioAjustado = resultado.CostoPromedioNuevo;
                        // CostoVentaAjustado queda fuera de este módulo (pertenece a Pricing).
                    }
                }

                liquidacion.AsientoContableId = asiento.AsientoId;
                liquidacion.Estado = EstadosLiquidacion.Confirmado;
                liquidacion.UsuarioModificacionId = dto.UsuarioId ?? usuarioId;
                liquidacion.FechaModificacion = fechaConfirmacion;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return new ResultadoConfirmacionDto(
                    liquidacionId, asiento.AsientoId, asiento.NumeroAsiento,
                    asiento.TotalDebe, asiento.TotalHaber, items.Count);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task<string> GenerarNumeroAsientoAsync()
        {
            var anio = DateTime.UtcNow.Year;
            var correlativo = await _context.LiquidacionAsientos.CountAsync(a => a.Fecha.Year == anio) + 1;
            return $"LC-{anio}-{correlativo:D6}";
        }

        // =====================================================================
        // MAPEOS
        // =====================================================================

        private async Task<LiquidacionCostoDto> MapToDtoAsync(LiquidacionCosto entity)
        {
            var compraIds = entity.Compras.Select(c => c.CompraId).Distinct().ToList();
            var resumenes = compraIds.Count > 0
                ? await _comprasProvider.ObtenerResumenesAsync(compraIds)
                : new List<CompraResumenDto>();
            var resumenPorId = resumenes.ToDictionary(r => r.CompraId);

            var compras = entity.Compras
                .Select(c =>
                {
                    resumenPorId.TryGetValue(c.CompraId, out var resumen);
                    return new LiquidacionCompraDto(
                        c.LiquidacionCompraId,
                        c.CompraId,
                        resumen?.Proveedor ?? "(no disponible)",
                        resumen?.Documento ?? "(no disponible)",
                        c.TotalCompra);
                })
                .ToList();

            var proveedorIds = entity.Costos
                .Where(c => c.ProveedorId.HasValue)
                .Select(c => c.ProveedorId!.Value)
                .Distinct()
                .ToList();
            var nombresProveedor = proveedorIds.Count > 0
                ? await _proveedorService.ObtenerNombresAsync(proveedorIds)
                : new Dictionary<int, string>();

            var costos = entity.Costos
                .Select(c => MapCostoDetalleToDto(
                    c,
                    c.TipoCosto?.Nombre ?? string.Empty,
                    c.MetodoDistribucion?.Codigo ?? string.Empty,
                    c.ProveedorId.HasValue && nombresProveedor.TryGetValue(c.ProveedorId.Value, out var nombre) ? nombre : null))
                .ToList();

            return new LiquidacionCostoDto(
                entity.LiquidacionCostoId, entity.Numero, entity.Fecha, entity.AlmacenId,
                entity.MonedaCodigo, entity.TipoCambio, entity.Estado,
                entity.TotalMercaderia, entity.TotalCostos, entity.TotalLiquidacion,
                entity.AsientoContableId, entity.Observacion, compras, costos);
        }

        private static LiquidacionCostoDetalleDto MapCostoDetalleToDto(
            LiquidacionCostoDetalle d, string tipoCostoNombre, string metodoDistribucionCodigo, string? proveedorNombre) => new(
                d.LiquidacionCostoDetalleId, d.TipoCostoId, tipoCostoNombre,
                d.ProveedorId, proveedorNombre, d.TipoDocumento, d.Serie, d.NumeroDocumento,
                d.Importe, d.MonedaCodigo, d.TipoCambio, d.ImporteBase,
                d.MetodoDistribucionId, metodoDistribucionCodigo, d.CuentaContableId);
    }
}
