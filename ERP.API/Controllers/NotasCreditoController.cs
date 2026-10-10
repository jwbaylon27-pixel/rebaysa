/*using ERP.API.Dtos;
using ERP.Domain.Entities;
using ERP.Persistence.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System.Data;

namespace ERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMINISTRADOR,VENDEDOR")]
public class NotasCreditoController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public NotasCreditoController(ApplicationDbContext context)
    {
        _context = context;
    }

    // ====================================================================
    // GET api/NotasCredito/venta/5/disponible
    // Cuanto queda por acreditar de cada producto de la venta.
    // ====================================================================
    [HttpGet("venta/{ventaId:int}/disponible")]
    public async Task<IActionResult> Disponible(int ventaId)
    {
        var venta = await _context.Ventas
            .Include(v => v.Cliente)
            .Include(v => v.Detalles)
                .ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(v => v.Id == ventaId);

        if (venta == null)
            return NotFound(new { error = "La venta no existe." });

        var yaAcreditado = await _context.NotaCreditoDetalle
            .Where(d => d.NotaCredito != null && d.NotaCredito.VentaId == ventaId)
            .GroupBy(d => d.ProductoId)
            .Select(g => new { ProductoId = g.Key, Cantidad = g.Sum(x => x.Cantidad) })
            .ToDictionaryAsync(x => x.ProductoId, x => x.Cantidad);

        var items = venta.Detalles.Select(d =>
        {
            var acreditado = yaAcreditado.TryGetValue(d.ProductoId, out var c) ? c : 0;
            return new ItemCreditoDisponibleDto(
                d.ProductoId,
                d.Producto != null ? d.Producto.Nombre : string.Empty,
                d.Cantidad,
                acreditado,
                Math.Max(d.Cantidad - acreditado, 0),
                d.Cantidad > 0 ? decimal.Round(d.Total / d.Cantidad, 2) : d.PrecioUnitario
            );
        }).ToList();

        var totalAcreditado = await _context.NotasCredito
            .Where(n => n.VentaId == ventaId && n.Estado != "ANULADO")
            .SumAsync(n => (decimal?)n.Total) ?? 0m;

        var totalDisponible = Math.Max(venta.Total - totalAcreditado, 0);

        var dto = new VentaCreditoDisponibleDto(
            venta.Id,
            venta.TipoDocumento,
            venta.Serie,
            venta.NumeroDocumento,
            venta.Cliente != null ? venta.Cliente.Nombres : string.Empty,
            venta.MetodoPago,
            venta.Total,
            totalAcreditado,
            totalDisponible,
            venta.Estado != "ANULADO" && totalDisponible > 0.005m,
            items
        );

        return Ok(dto);
    }

    // ====================================================================
    // POST api/NotasCredito
    // ====================================================================
    [HttpPost]
    public async Task<IActionResult> Registrar(RegistrarNotaCreditoDto request)
    {
        var venta = await _context.Ventas
            .Include(v => v.Cliente)
            .Include(v => v.Detalles)
                .ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(v => v.Id == request.VentaId);

        if (venta == null)
            return BadRequest(new { error = "La venta no existe." });

        if (venta.Estado == "ANULADO")
            return BadRequest(new { error = "La venta ya esta anulada." });

        if (venta.Cliente == null)
            return BadRequest(new { error = "La venta no tiene un cliente asociado." });

        if (string.IsNullOrWhiteSpace(request.Serie) || string.IsNullOrWhiteSpace(request.NumeroDocumento))
            return BadRequest(new { error = "Debe indicar Serie y Numero de la nota de credito." });

        var esTotal = string.Equals(request.TipoAfectacion, "TOTAL", StringComparison.OrdinalIgnoreCase);

        // Cuanto se acredito ya, por producto
        var yaAcreditadoPorProducto = await _context.NotaCreditoDetalle
            .Where(d => d.NotaCredito != null && d.NotaCredito.VentaId == request.VentaId)
            .GroupBy(d => d.ProductoId)
            .Select(g => new { ProductoId = g.Key, Cantidad = g.Sum(x => x.Cantidad) })
            .ToDictionaryAsync(x => x.ProductoId, x => x.Cantidad);

        var itemsACreditar = new List<(int ProductoId, int Cantidad, decimal PrecioUnitario)>();

            if (esTotal)
            {
                foreach (var d in venta.Detalles)
                {
                    var acreditado = yaAcreditadoPorProducto.TryGetValue(d.ProductoId, out var c) ? c : 0;
                    var disponible = d.Cantidad - acreditado;
                    if (disponible > 0)
                    {
                        var precioNeto = d.Cantidad > 0 ? decimal.Round(d.Total / d.Cantidad, 2) : d.PrecioUnitario;
                        itemsACreditar.Add((d.ProductoId, disponible, precioNeto));
                    }
                }

                if (itemsACreditar.Count == 0)
                    return BadRequest(new { error = "Esta venta ya fue acreditada por completo." });
            }
        else
        {
            if (request.Detalles == null || request.Detalles.Count == 0)
                return BadRequest(new { error = "Debe indicar los productos y cantidades a acreditar." });

            foreach (var item in request.Detalles)
            {
                var detalleVenta = venta.Detalles.FirstOrDefault(d => d.ProductoId == item.ProductoId);
                if (detalleVenta == null)
                    return BadRequest(new { error = $"El producto {item.ProductoId} no pertenece a esta venta." });

                if (item.Cantidad <= 0)
                    return BadRequest(new { error = "La cantidad a acreditar debe ser mayor a cero." });

                var acreditado = yaAcreditadoPorProducto.TryGetValue(item.ProductoId, out var c) ? c : 0;
                var disponible = detalleVenta.Cantidad - acreditado;

                if (item.Cantidad > disponible)
                    return BadRequest(new
                    {
                        error = $"Solo quedan {disponible} unidades disponibles para acreditar del producto {detalleVenta.ProductoId}."
                    });

                var precioNetoParcial = detalleVenta.Cantidad > 0
                    ? decimal.Round(detalleVenta.Total / detalleVenta.Cantidad, 2)
                    : detalleVenta.PrecioUnitario;
                itemsACreditar.Add((item.ProductoId, item.Cantidad, precioNetoParcial));
            }
        }

        var subTotal = itemsACreditar.Sum(i => i.Cantidad * i.PrecioUnitario);
        var igv = decimal.Round(subTotal * 0.18m, 2);
        var total = subTotal + igv;

        if (total <= 0)
            return BadRequest(new { error = "El monto a acreditar debe ser mayor a cero." });

        var usuarioId = await ResolverUsuarioId(request.UsuarioId);
        if (usuarioId == null)
            return BadRequest(new { error = "No hay usuarios registrados para asociar la nota de credito." });

        var cuentaClienteId = await ResolverCuentaId("121");
        var cuentaVentasId = await ResolverCuentaId("70111");
        var cuentaIgvId = await ResolverCuentaId("40111");
        if (cuentaClienteId == null || cuentaVentasId == null || cuentaIgvId == null)
            return BadRequest(new { error = "Faltan cuentas contables activas (121, 70111, 40111)." });

        int? almacenId = null;
        if (request.DevolucionFisica)
        {
            almacenId = await ResolverAlmacenId();
            if (almacenId == null)
                return BadRequest(new { error = "No hay almacenes activos para registrar la devolucion." });
        }

        var notaCredito = new NotaCredito
        {
            VentaId = venta.Id,
            Fecha = DateTime.UtcNow,
            Serie = request.Serie,
            NumeroDocumento = request.NumeroDocumento,
            Motivo = request.Motivo,
            TipoAfectacion = esTotal ? "TOTAL" : "PARCIAL",
            DevolucionFisica = request.DevolucionFisica,
            SubTotal = subTotal,
            IGV = igv,
            Total = total,
            Estado = "REGISTRADO",
            UsuarioId = usuarioId.Value,
            Detalles = itemsACreditar.Select(i => new NotaCreditoDetalle
            {
                ProductoId = i.ProductoId,
                Cantidad = i.Cantidad,
                PrecioUnitario = i.PrecioUnitario,
                Total = i.Cantidad * i.PrecioUnitario
            }).ToList()
        };

        try
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            _context.NotasCredito.Add(notaCredito);
            await _context.SaveChangesAsync();

            var glosa = $"NC {notaCredito.Serie}-{notaCredito.NumeroDocumento} (Venta {venta.TipoDocumento} {venta.Serie}-{venta.NumeroDocumento})";

            var asientoId = await ExecuteScalarIntAsync(
                """
                INSERT INTO dbo.AsientoContable
                    (Fecha, TipoOperacion, ReferenciaId, Glosa, TotalDebe, TotalHaber, UsuarioId, FechaRegistro)
                VALUES
                    (@Fecha, @TipoOperacion, @ReferenciaId, @Glosa, @Total, @Total, @UsuarioId, GETDATE());

                SELECT CAST(SCOPE_IDENTITY() AS int);
                """,
                ("@Fecha", notaCredito.Fecha),
                ("@TipoOperacion", "NOTA_CREDITO"),
                ("@ReferenciaId", notaCredito.Id),
                ("@Glosa", glosa),
                ("@Total", total),
                ("@UsuarioId", usuarioId.Value));

            // Reverso del asiento de venta: Debe Ventas + IGV, Haber Cliente
            await _context.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO dbo.AsientoContableDetalle (AsientoId, CuentaId, Debe, Haber, Glosa)
                VALUES
                    ({0}, {1}, {2}, 0, {6}),
                    ({0}, {3}, {4}, 0, {6}),
                    ({0}, {5}, 0, {7}, {6});
                """,
                asientoId,
                cuentaVentasId,
                subTotal,
                cuentaIgvId,
                igv,
                cuentaClienteId,
                glosa,
                total);

            notaCredito.AsientoId = asientoId;
            await _context.SaveChangesAsync();

            // Devolucion fisica de stock
            if (request.DevolucionFisica)
            {
                foreach (var item in itemsACreditar)
                {
                    await RegistrarDevolucionInventario(
                        notaCredito, venta, item.ProductoId, item.Cantidad, almacenId!.Value);
                }
            }

            // Reducir el saldo pendiente si la venta fue al credito
            if (string.Equals(venta.MetodoPago, "CREDITO", StringComparison.OrdinalIgnoreCase))
            {
                venta.Cliente.Saldo = venta.Cliente.Saldo - total;
                if (venta.Cliente.Saldo < 0)
                    venta.Cliente.Saldo = 0;
            }

            // Si con esta nota se acredito todo lo que quedaba, anular la venta
            var totalAcreditadoAcumulado = await _context.NotasCredito
                .Where(n => n.VentaId == venta.Id)
                .SumAsync(n => n.Total);

            if (venta.Total - totalAcreditadoAcumulado <= 0.005m)
                venta.Estado = "ANULADO";

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { error = ex.InnerException?.Message ?? ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        return Ok(new
        {
            mensaje = "Nota de credito registrada correctamente.",
            notaCreditoId = notaCredito.Id,
            asientoId = notaCredito.AsientoId,
            total = notaCredito.Total,
            ventaAnulada = venta.Estado == "ANULADO"
        });
    }

    private async Task RegistrarDevolucionInventario(
        NotaCredito notaCredito, Venta venta, int productoId, int cantidad, int almacenId)
    {
        var stockAnterior = await _context.Database
            .SqlQueryRaw<int>(
                """
                SELECT ISNULL(
                    (SELECT StockActual FROM dbo.Inventario WHERE ProductoId = {0} AND AlmacenId = {1}),
                    0
                ) AS Value
                """,
                productoId,
                almacenId)
            .FirstAsync();

        var costoUnitario = await _context.Database
            .SqlQueryRaw<decimal>(
                """
                SELECT ISNULL(
                    (SELECT CostoPromedio FROM dbo.Inventario WHERE ProductoId = {0} AND AlmacenId = {1}),
                    0
                ) AS Value
                """,
                productoId,
                almacenId)
            .FirstAsync();

        var stockNuevo = stockAnterior + cantidad;

        var existeInventario = await _context.Database
            .SqlQueryRaw<int>(
                "SELECT COUNT(1) AS Value FROM dbo.Inventario WHERE ProductoId = {0} AND AlmacenId = {1}",
                productoId,
                almacenId)
            .FirstAsync();

        if (existeInventario > 0)
        {
            await _context.Database.ExecuteSqlRawAsync(
                """
                UPDATE dbo.Inventario
                SET StockActual = {2},
                    UltimaActualizacion = GETDATE()
                WHERE ProductoId = {0}
                  AND AlmacenId = {1};
                """,
                productoId, almacenId, stockNuevo);
        }
        else
        {
            await _context.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO dbo.Inventario
                    (ProductoId, AlmacenId, StockActual, CostoPromedio, UltimaActualizacion)
                VALUES
                    ({0}, {1}, {2}, {3}, GETDATE());
                """,
                productoId, almacenId, stockNuevo, costoUnitario);
        }

        const string tipoMovimiento = "DEVOLUCION";
        var referencia = $"NC {notaCredito.Serie}-{notaCredito.NumeroDocumento}";

        var tipoMovimientoId = await _context.Database
            .SqlQueryRaw<int>(
                "SELECT TOP 1 Id AS Value FROM dbo.TiposMovimiento WHERE Codigo = {0} AND Tipo = {1} AND ISNULL(Activo, 1) = 1 ORDER BY Id",
                tipoMovimiento,
                "ENTRADA")
            .FirstOrDefaultAsync();

        if (tipoMovimientoId == 0)
            throw new InvalidOperationException("No existe un tipo de movimiento activo con codigo DEVOLUCION (revisa la migracion).");

        var movimientoInventarioId = await ExecuteScalarIntAsync(
            """
            INSERT INTO dbo.MovimientosInventario
                (ProductoId, AlmacenId, TipoMovimientoId, Documento, DocumentoId, Cantidad,
                 CostoUnitario, Observacion, UsuarioId, Fecha)
            VALUES
                (@ProductoId, @AlmacenId, @TipoMovimientoId, @Documento, @DocumentoId, @Cantidad,
                 @CostoUnitario, @Observacion, @UsuarioId, @Fecha);

            SELECT CAST(SCOPE_IDENTITY() AS int);
            """,
            ("@ProductoId", productoId),
            ("@AlmacenId", almacenId),
            ("@TipoMovimientoId", tipoMovimientoId),
            ("@Documento", referencia),
            ("@DocumentoId", notaCredito.Id),
            ("@Cantidad", cantidad),
            ("@CostoUnitario", costoUnitario),
            ("@Observacion", notaCredito.Motivo ?? "Devolucion por nota de credito"),
            ("@UsuarioId", notaCredito.UsuarioId),
            ("@Fecha", notaCredito.Fecha));

        await ExecuteScalarIntAsync(
            """
            INSERT INTO dbo.Kardex
                (ProductoId, AlmacenId, TipoMovimiento, Referencia, ReferenciaId, Cantidad,
                 StockAnterior, StockNuevo, CostoUnitario, Fecha, UsuarioId)
            VALUES
                (@ProductoId, @AlmacenId, @TipoMovimiento, @Referencia, @ReferenciaId, @Cantidad,
                 @StockAnterior, @StockNuevo, @CostoUnitario, @Fecha, @UsuarioId);

            SELECT CAST(SCOPE_IDENTITY() AS int);
            """,
            ("@ProductoId", productoId),
            ("@AlmacenId", almacenId),
            ("@TipoMovimiento", tipoMovimiento),
            ("@Referencia", referencia),
            ("@ReferenciaId", notaCredito.Id),
            ("@Cantidad", cantidad),
            ("@StockAnterior", stockAnterior),
            ("@StockNuevo", stockNuevo),
            ("@CostoUnitario", costoUnitario),
            ("@Fecha", notaCredito.Fecha),
            ("@UsuarioId", notaCredito.UsuarioId));

        await _context.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO dbo.KardexDetalle
                (MovimientoId, ProductoId, AlmacenId, TipoMovimiento, Documento, DocumentoId,
                 Entrada, Salida, StockAnterior, StockActual, CostoUnitario, CostoTotal, Fecha, UsuarioId)
            VALUES
                ({0}, {1}, {2}, {3}, {4}, {5}, {6}, 0, {7}, {8}, {9}, {10}, {11}, {12});
            """,
            movimientoInventarioId,
            productoId,
            almacenId,
            tipoMovimiento,
            referencia,
            notaCredito.Id,
            cantidad,
            stockAnterior,
            stockNuevo,
            costoUnitario,
            costoUnitario * cantidad,
            notaCredito.Fecha,
            notaCredito.UsuarioId);
    }

    private async Task<int?> ResolverAlmacenId()
    {
        var almacenes = await _context.Database
            .SqlQueryRaw<int>("SELECT TOP 1 Id AS Value FROM dbo.Almacenes WHERE ISNULL(Activo, 1) = 1 ORDER BY Id")
            .ToListAsync();

        return almacenes.FirstOrDefault() == 0 ? null : almacenes.First();
    }

    private async Task<int?> ResolverCuentaId(string codigo)
    {
        var cuentas = await _context.Database
            .SqlQueryRaw<int>(
                "SELECT TOP 1 Id AS Value FROM dbo.PlanCuentas WHERE Codigo = {0} AND Activo = 1 AND EsMovimiento = 1 ORDER BY Id",
                codigo)
            .ToListAsync();

        return cuentas.FirstOrDefault() == 0 ? null : cuentas.First();
    }

    private async Task<int?> ResolverUsuarioId(int? usuarioId)
    {
        if (usuarioId.HasValue)
        {
            var existeUsuario = await _context.Database
                .SqlQueryRaw<int>("SELECT COUNT(1) AS Value FROM dbo.Usuarios WHERE Id = {0}", usuarioId.Value)
                .FirstAsync();

            if (existeUsuario > 0)
                return usuarioId.Value;
        }

        var usuarios = await _context.Database
            .SqlQueryRaw<int>("SELECT TOP 1 Id AS Value FROM dbo.Usuarios ORDER BY Id")
            .ToListAsync();

        return usuarios.FirstOrDefault() == 0 ? null : usuarios.First();
    }

    private async Task<int> ExecuteScalarIntAsync(string sql, params (string Name, object? Value)[] parameters)
    {
        var connection = _context.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.Transaction = _context.Database.CurrentTransaction?.GetDbTransaction();

        foreach (var (name, value) in parameters)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value ?? DBNull.Value;
            command.Parameters.Add(parameter);
        }

        var result = await command.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }
}
*/
using ERP.API.Dtos;
using ERP.Domain.Entities;
using ERP.Persistence.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System.Data;

namespace ERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "ADMINISTRADOR,VENDEDOR")]
public class NotasCreditoController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public NotasCreditoController(ApplicationDbContext context)
    {
        _context = context;
    }

    // ====================================================================
    // GET api/NotasCredito/venta/5/disponible
    // Cuanto queda por acreditar de cada producto de la venta.
    // ====================================================================
    [HttpGet("venta/{ventaId:int}/disponible")]
    public async Task<IActionResult> Disponible(int ventaId)
    {
        var venta = await _context.Ventas
            .Include(v => v.Cliente)
            .Include(v => v.Detalles)
                .ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(v => v.Id == ventaId);

        if (venta == null)
            return NotFound(new { error = "La venta no existe." });

        var yaAcreditado = await _context.NotaCreditoDetalle
            .Where(d => d.NotaCredito != null && d.NotaCredito.VentaId == ventaId)
            .GroupBy(d => d.ProductoId)
            .Select(g => new { ProductoId = g.Key, Cantidad = g.Sum(x => x.Cantidad) })
            .ToDictionaryAsync(x => x.ProductoId, x => x.Cantidad);

        var items = venta.Detalles.Select(d =>
        {
            var acreditado = yaAcreditado.TryGetValue(d.ProductoId, out var c) ? c : 0;
            return new ItemCreditoDisponibleDto(
                d.ProductoId,
                d.Producto != null ? d.Producto.Nombre : string.Empty,
                d.Cantidad,
                acreditado,
                Math.Max(d.Cantidad - acreditado, 0),
                d.Cantidad > 0 ? decimal.Round(d.Total / d.Cantidad, 2) : d.PrecioUnitario
            );
        }).ToList();

        var totalAcreditado = await _context.NotasCredito
            .Where(n => n.VentaId == ventaId && n.Estado != "ANULADO")
            .SumAsync(n => (decimal?)n.Total) ?? 0m;

        var totalDisponible = Math.Max(venta.Total - totalAcreditado, 0);

        var dto = new VentaCreditoDisponibleDto(
            venta.Id,
            venta.TipoDocumento,
            venta.Serie,
            venta.NumeroDocumento,
            venta.Cliente != null ? venta.Cliente.Nombres : string.Empty,
            venta.MetodoPago,
            venta.Total,
            totalAcreditado,
            totalDisponible,
            venta.Estado != "ANULADO" && totalDisponible > 0.005m,
            items
        );

        return Ok(dto);
    }

    // ====================================================================
    // POST api/NotasCredito
    // ====================================================================
    [HttpPost]
    public async Task<IActionResult> Registrar(RegistrarNotaCreditoDto request)
    {
        var venta = await _context.Ventas
            .Include(v => v.Cliente)
            .Include(v => v.Detalles)
                .ThenInclude(d => d.Producto)
            .FirstOrDefaultAsync(v => v.Id == request.VentaId);

        if (venta == null)
            return BadRequest(new { error = "La venta no existe." });

        if (venta.Estado == "ANULADO")
            return BadRequest(new { error = "La venta ya esta anulada." });

        if (venta.Cliente == null)
            return BadRequest(new { error = "La venta no tiene un cliente asociado." });

        if (string.IsNullOrWhiteSpace(request.Serie) || string.IsNullOrWhiteSpace(request.NumeroDocumento))
            return BadRequest(new { error = "Debe indicar Serie y Numero de la nota de credito." });

        var esTotal = string.Equals(request.TipoAfectacion, "TOTAL", StringComparison.OrdinalIgnoreCase);

        // Cuanto se acredito ya, por producto
        var yaAcreditadoPorProducto = await _context.NotaCreditoDetalle
            .Where(d => d.NotaCredito != null && d.NotaCredito.VentaId == request.VentaId)
            .GroupBy(d => d.ProductoId)
            .Select(g => new { ProductoId = g.Key, Cantidad = g.Sum(x => x.Cantidad) })
            .ToDictionaryAsync(x => x.ProductoId, x => x.Cantidad);

        var itemsACreditar = new List<(int ProductoId, int Cantidad, decimal PrecioUnitario)>();

        if (esTotal)
        {
            foreach (var d in venta.Detalles)
            {
                var acreditado = yaAcreditadoPorProducto.TryGetValue(d.ProductoId, out var c) ? c : 0;
                var disponible = d.Cantidad - acreditado;
                if (disponible > 0)
                {
                    var precioNeto = d.Cantidad > 0 ? decimal.Round(d.Total / d.Cantidad, 2) : d.PrecioUnitario;
                    itemsACreditar.Add((d.ProductoId, disponible, precioNeto));
                }
            }

            if (itemsACreditar.Count == 0)
                return BadRequest(new { error = "Esta venta ya fue acreditada por completo." });
        }
        else
        {
            if (request.Detalles == null || request.Detalles.Count == 0)
                return BadRequest(new { error = "Debe indicar los productos y cantidades a acreditar." });

            foreach (var item in request.Detalles)
            {
                var detalleVenta = venta.Detalles.FirstOrDefault(d => d.ProductoId == item.ProductoId);
                if (detalleVenta == null)
                    return BadRequest(new { error = $"El producto {item.ProductoId} no pertenece a esta venta." });

                if (item.Cantidad <= 0)
                    return BadRequest(new { error = "La cantidad a acreditar debe ser mayor a cero." });

                var acreditado = yaAcreditadoPorProducto.TryGetValue(item.ProductoId, out var c) ? c : 0;
                var disponible = detalleVenta.Cantidad - acreditado;

                if (item.Cantidad > disponible)
                    return BadRequest(new
                    {
                        error = $"Solo quedan {disponible} unidades disponibles para acreditar del producto {detalleVenta.ProductoId}."
                    });

                var precioNetoParcial = detalleVenta.Cantidad > 0
                    ? decimal.Round(detalleVenta.Total / detalleVenta.Cantidad, 2)
                    : detalleVenta.PrecioUnitario;
                itemsACreditar.Add((item.ProductoId, item.Cantidad, precioNetoParcial));
            }
        }

        var subTotal = itemsACreditar.Sum(i => i.Cantidad * i.PrecioUnitario);
        var igv = decimal.Round(subTotal * 0.18m, 2);
        var total = subTotal + igv;

        if (total <= 0)
            return BadRequest(new { error = "El monto a acreditar debe ser mayor a cero." });

        var usuarioId = await ResolverUsuarioId(request.UsuarioId);
        if (usuarioId == null)
            return BadRequest(new { error = "No hay usuarios registrados para asociar la nota de credito." });

        var cuentaClienteId = await ResolverCuentaId("121");
        var cuentaVentasId = await ResolverCuentaId("70111");
        var cuentaIgvId = await ResolverCuentaId("40111");
        if (cuentaClienteId == null || cuentaVentasId == null || cuentaIgvId == null)
            return BadRequest(new { error = "Faltan cuentas contables activas (121, 70111, 40111)." });

        int? almacenId = null;
        if (request.DevolucionFisica)
        {
            almacenId = await ResolverAlmacenId();
            if (almacenId == null)
                return BadRequest(new { error = "No hay almacenes activos para registrar la devolucion." });
        }

        var notaCredito = new NotaCredito
        {
            VentaId = venta.Id,
            Fecha = request.Fecha ?? DateTime.UtcNow,
            Serie = request.Serie,
            NumeroDocumento = request.NumeroDocumento,
            Motivo = request.Motivo,
            TipoAfectacion = esTotal ? "TOTAL" : "PARCIAL",
            DevolucionFisica = request.DevolucionFisica,
            SubTotal = subTotal,
            IGV = igv,
            Total = total,
            Estado = "REGISTRADO",
            UsuarioId = usuarioId.Value,
            Detalles = itemsACreditar.Select(i => new NotaCreditoDetalle
            {
                ProductoId = i.ProductoId,
                Cantidad = i.Cantidad,
                PrecioUnitario = i.PrecioUnitario,
                Total = i.Cantidad * i.PrecioUnitario
            }).ToList()
        };

        try
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            _context.NotasCredito.Add(notaCredito);
            await _context.SaveChangesAsync();

            var glosa = $"NC {notaCredito.Serie}-{notaCredito.NumeroDocumento} (Venta {venta.TipoDocumento} {venta.Serie}-{venta.NumeroDocumento})";

            var asientoId = await ExecuteScalarIntAsync(
                """
                INSERT INTO dbo.AsientoContable
                    (Fecha, TipoOperacion, ReferenciaId, Glosa, TotalDebe, TotalHaber, UsuarioId, FechaRegistro)
                VALUES
                    (@Fecha, @TipoOperacion, @ReferenciaId, @Glosa, @Total, @Total, @UsuarioId, GETDATE());

                SELECT CAST(SCOPE_IDENTITY() AS int);
                """,
                ("@Fecha", notaCredito.Fecha),
                ("@TipoOperacion", "NOTA_CREDITO"),
                ("@ReferenciaId", notaCredito.Id),
                ("@Glosa", glosa),
                ("@Total", total),
                ("@UsuarioId", usuarioId.Value));

            // Reverso del asiento de venta: Debe Ventas + IGV, Haber Cliente
            await _context.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO dbo.AsientoContableDetalle (AsientoId, CuentaId, Debe, Haber, Glosa)
                VALUES
                    ({0}, {1}, {2}, 0, {6}),
                    ({0}, {3}, {4}, 0, {6}),
                    ({0}, {5}, 0, {7}, {6});
                """,
                asientoId,
                cuentaVentasId,
                subTotal,
                cuentaIgvId,
                igv,
                cuentaClienteId,
                glosa,
                total);

            notaCredito.AsientoId = asientoId;
            await _context.SaveChangesAsync();

            // Devolucion fisica de stock
            if (request.DevolucionFisica)
            {
                foreach (var item in itemsACreditar)
                {
                    await RegistrarDevolucionInventario(
                        notaCredito, venta, item.ProductoId, item.Cantidad, almacenId!.Value);
                }
            }

            // Reducir el saldo pendiente si la venta fue al credito
            if (string.Equals(venta.MetodoPago, "CREDITO", StringComparison.OrdinalIgnoreCase))
            {
                venta.Cliente.Saldo = venta.Cliente.Saldo - total;
                if (venta.Cliente.Saldo < 0)
                    venta.Cliente.Saldo = 0;
            }

            // Si con esta nota se acredito todo lo que quedaba, anular la venta
            var totalAcreditadoAcumulado = await _context.NotasCredito
                .Where(n => n.VentaId == venta.Id)
                .SumAsync(n => n.Total);

            if (venta.Total - totalAcreditadoAcumulado <= 0.005m)
                venta.Estado = "ANULADO";

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new { error = ex.InnerException?.Message ?? ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        return Ok(new
        {
            mensaje = "Nota de credito registrada correctamente.",
            notaCreditoId = notaCredito.Id,
            asientoId = notaCredito.AsientoId,
            total = notaCredito.Total,
            ventaAnulada = venta.Estado == "ANULADO"
        });
    }

    private async Task RegistrarDevolucionInventario(
        NotaCredito notaCredito, Venta venta, int productoId, int cantidad, int almacenId)
    {
        var stockAnterior = await _context.Database
            .SqlQueryRaw<int>(
                """
                SELECT ISNULL(
                    (SELECT StockActual FROM dbo.Inventario WHERE ProductoId = {0} AND AlmacenId = {1}),
                    0
                ) AS Value
                """,
                productoId,
                almacenId)
            .FirstAsync();

        var costoUnitario = await _context.Database
            .SqlQueryRaw<decimal>(
                """
                SELECT ISNULL(
                    (SELECT CostoPromedio FROM dbo.Inventario WHERE ProductoId = {0} AND AlmacenId = {1}),
                    0
                ) AS Value
                """,
                productoId,
                almacenId)
            .FirstAsync();

        var stockNuevo = stockAnterior + cantidad;

        var existeInventario = await _context.Database
            .SqlQueryRaw<int>(
                "SELECT COUNT(1) AS Value FROM dbo.Inventario WHERE ProductoId = {0} AND AlmacenId = {1}",
                productoId,
                almacenId)
            .FirstAsync();

        if (existeInventario > 0)
        {
            await _context.Database.ExecuteSqlRawAsync(
                """
                UPDATE dbo.Inventario
                SET StockActual = {2},
                    UltimaActualizacion = GETDATE()
                WHERE ProductoId = {0}
                  AND AlmacenId = {1};
                """,
                productoId, almacenId, stockNuevo);
        }
        else
        {
            await _context.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO dbo.Inventario
                    (ProductoId, AlmacenId, StockActual, CostoPromedio, UltimaActualizacion)
                VALUES
                    ({0}, {1}, {2}, {3}, GETDATE());
                """,
                productoId, almacenId, stockNuevo, costoUnitario);
        }

        const string tipoMovimiento = "DEVOLUCION";
        var referencia = $"NC {notaCredito.Serie}-{notaCredito.NumeroDocumento}";

        var tipoMovimientoId = await _context.Database
            .SqlQueryRaw<int>(
                "SELECT TOP 1 Id AS Value FROM dbo.TiposMovimiento WHERE Codigo = {0} AND Tipo = {1} AND ISNULL(Activo, 1) = 1 ORDER BY Id",
                tipoMovimiento,
                "ENTRADA")
            .FirstOrDefaultAsync();

        if (tipoMovimientoId == 0)
            throw new InvalidOperationException("No existe un tipo de movimiento activo con codigo DEVOLUCION (revisa la migracion).");

        var movimientoInventarioId = await ExecuteScalarIntAsync(
            """
            INSERT INTO dbo.MovimientosInventario
                (ProductoId, AlmacenId, TipoMovimientoId, Documento, DocumentoId, Cantidad,
                 CostoUnitario, Observacion, UsuarioId, Fecha)
            VALUES
                (@ProductoId, @AlmacenId, @TipoMovimientoId, @Documento, @DocumentoId, @Cantidad,
                 @CostoUnitario, @Observacion, @UsuarioId, @Fecha);

            SELECT CAST(SCOPE_IDENTITY() AS int);
            """,
            ("@ProductoId", productoId),
            ("@AlmacenId", almacenId),
            ("@TipoMovimientoId", tipoMovimientoId),
            ("@Documento", referencia),
            ("@DocumentoId", notaCredito.Id),
            ("@Cantidad", cantidad),
            ("@CostoUnitario", costoUnitario),
            ("@Observacion", notaCredito.Motivo ?? "Devolucion por nota de credito"),
            ("@UsuarioId", notaCredito.UsuarioId),
            ("@Fecha", notaCredito.Fecha));

        await ExecuteScalarIntAsync(
            """
            INSERT INTO dbo.Kardex
                (ProductoId, AlmacenId, TipoMovimiento, Referencia, ReferenciaId, Cantidad,
                 StockAnterior, StockNuevo, CostoUnitario, Fecha, UsuarioId)
            VALUES
                (@ProductoId, @AlmacenId, @TipoMovimiento, @Referencia, @ReferenciaId, @Cantidad,
                 @StockAnterior, @StockNuevo, @CostoUnitario, @Fecha, @UsuarioId);

            SELECT CAST(SCOPE_IDENTITY() AS int);
            """,
            ("@ProductoId", productoId),
            ("@AlmacenId", almacenId),
            ("@TipoMovimiento", tipoMovimiento),
            ("@Referencia", referencia),
            ("@ReferenciaId", notaCredito.Id),
            ("@Cantidad", cantidad),
            ("@StockAnterior", stockAnterior),
            ("@StockNuevo", stockNuevo),
            ("@CostoUnitario", costoUnitario),
            ("@Fecha", notaCredito.Fecha),
            ("@UsuarioId", notaCredito.UsuarioId));

        await _context.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO dbo.KardexDetalle
                (MovimientoId, ProductoId, AlmacenId, TipoMovimiento, Documento, DocumentoId,
                 Entrada, Salida, StockAnterior, StockActual, CostoUnitario, CostoTotal, Fecha, UsuarioId)
            VALUES
                ({0}, {1}, {2}, {3}, {4}, {5}, {6}, 0, {7}, {8}, {9}, {10}, {11}, {12});
            """,
            movimientoInventarioId,
            productoId,
            almacenId,
            tipoMovimiento,
            referencia,
            notaCredito.Id,
            cantidad,
            stockAnterior,
            stockNuevo,
            costoUnitario,
            costoUnitario * cantidad,
            notaCredito.Fecha,
            notaCredito.UsuarioId);
    }

    private async Task<int?> ResolverAlmacenId()
    {
        var almacenes = await _context.Database
            .SqlQueryRaw<int>("SELECT TOP 1 Id AS Value FROM dbo.Almacenes WHERE ISNULL(Activo, 1) = 1 ORDER BY Id")
            .ToListAsync();

        return almacenes.FirstOrDefault() == 0 ? null : almacenes.First();
    }

    private async Task<int?> ResolverCuentaId(string codigo)
    {
        var cuentas = await _context.Database
            .SqlQueryRaw<int>(
                "SELECT TOP 1 Id AS Value FROM dbo.PlanCuentas WHERE Codigo = {0} AND Activo = 1 AND EsMovimiento = 1 ORDER BY Id",
                codigo)
            .ToListAsync();

        return cuentas.FirstOrDefault() == 0 ? null : cuentas.First();
    }

    private async Task<int?> ResolverUsuarioId(int? usuarioId)
    {
        if (usuarioId.HasValue)
        {
            var existeUsuario = await _context.Database
                .SqlQueryRaw<int>("SELECT COUNT(1) AS Value FROM dbo.Usuarios WHERE Id = {0}", usuarioId.Value)
                .FirstAsync();

            if (existeUsuario > 0)
                return usuarioId.Value;
        }

        var usuarios = await _context.Database
            .SqlQueryRaw<int>("SELECT TOP 1 Id AS Value FROM dbo.Usuarios ORDER BY Id")
            .ToListAsync();

        return usuarios.FirstOrDefault() == 0 ? null : usuarios.First();
    }

    private async Task<int> ExecuteScalarIntAsync(string sql, params (string Name, object? Value)[] parameters)
    {
        var connection = _context.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.Transaction = _context.Database.CurrentTransaction?.GetDbTransaction();

        foreach (var (name, value) in parameters)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value ?? DBNull.Value;
            command.Parameters.Add(parameter);
        }

        var result = await command.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }
}