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
public class VentasController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public VentasController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var ventas = await _context.Ventas
            .Include(v => v.Cliente)
            .Include(v => v.Detalles)
            .ThenInclude(d => d.Producto)
            .OrderByDescending(v => v.Fecha)
            .Select(v => new MovimientoComercialDto(
                v.Id,
                v.Fecha,
                v.ClienteId,
                v.Cliente != null ? v.Cliente.Nombres : string.Empty,
                v.Detalles.Select(d => new MovimientoDetalleDto(
                    d.Id,
                    d.ProductoId,
                    d.Producto != null ? d.Producto.Nombre : string.Empty,
                    d.Cantidad,
                    d.PrecioUnitario,
                    d.Total
                )).ToList(),
                v.SubTotal,
                v.IGV,
                v.Total,
                v.Estado
            ))
            .ToListAsync();

        return Ok(ventas);
    }

    [HttpPost]
    public async Task<IActionResult> Crear(RegistrarVentaDto request)
    {
        var usuarioId = await ResolverUsuarioId(request.UsuarioId);
        if (usuarioId == null)
            return BadRequest(new { error = "No hay usuarios registrados para asociar la venta." });

        var cliente = await _context.SociosNegocio
            .FirstOrDefaultAsync(s => s.Id == request.ClienteId && s.TipoSocio == "C" && s.Activo);
        if (cliente == null)
            return BadRequest(new { error = "Selecciona un cliente activo." });

        if (request.Detalles.Count == 0)
            return BadRequest(new { error = "Debe agregar al menos un producto." });

        var almacenId = await ResolverAlmacenId();
        if (almacenId == null)
            return BadRequest(new { error = "No hay almacenes activos para registrar inventario." });

        var cuentaClienteId = await ResolverCuentaId("121");
        var cuentaVentasId = await ResolverCuentaId("70111");
        var cuentaIgvId = await ResolverCuentaId("40111");
        if (cuentaClienteId == null || cuentaVentasId == null || cuentaIgvId == null)
            return BadRequest(new { error = "Faltan cuentas contables activas para registrar el asiento de venta (121, 70111, 40111)." });

        decimal subTotal = 0;
        var detalles = new List<VentaDetalle>();

        foreach (var d in request.Detalles)
        {
            var producto = await _context.Productos
                .FirstOrDefaultAsync(p => p.Id == d.ProductoId && p.Activo);
            if (producto == null)
                return BadRequest(new { error = $"El producto con Id {d.ProductoId} no esta activo." });

            if (d.Cantidad <= 0 || d.PrecioUnitario < 0 || d.Descuento < 0)
                return BadRequest(new { error = "La cantidad, el precio y el descuento deben ser validos." });

            var totalDetalle = d.Cantidad * d.PrecioUnitario - d.Descuento;
            if (totalDetalle < 0)
                return BadRequest(new { error = "El descuento no puede superar el importe del detalle." });

            subTotal += totalDetalle;
            detalles.Add(new VentaDetalle
            {
                ProductoId = d.ProductoId,
                Cantidad = d.Cantidad,
                PrecioUnitario = d.PrecioUnitario,
                Descuento = d.Descuento,
                Total = totalDetalle
            });
        }

        var igv = decimal.Round(subTotal * 0.18m, 2);
        var total = subTotal + igv;

        var venta = new Venta
        {
            ClienteId = request.ClienteId,
            UsuarioId = usuarioId.Value,
            Fecha = request.Fecha == default ? DateTime.UtcNow : request.Fecha,
            TipoDocumento = string.IsNullOrWhiteSpace(request.TipoDocumento) ? "BOLETA" : request.TipoDocumento,
            Serie = request.Serie,
            NumeroDocumento = request.NumeroDocumento,
            SubTotal = subTotal,
            IGV = igv,
            Total = total,
            MetodoPago = string.IsNullOrWhiteSpace(request.MetodoPago) ? "EFECTIVO" : request.MetodoPago,
            Observacion = request.Observacion,
            Estado = "REGISTRADO",
            Detalles = detalles
        };

        try
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            _context.Ventas.Add(venta);
            await _context.SaveChangesAsync();

            var asientoId = await RegistrarAsientoVenta(
                venta,
                cuentaClienteId.Value,
                cuentaVentasId.Value,
                cuentaIgvId.Value);

            venta.AsientoId = asientoId;
            await _context.SaveChangesAsync();

            foreach (var detalle in venta.Detalles)
            {
                await RegistrarMovimientoInventario(venta, detalle, almacenId.Value);
            }

            await transaction.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            return BadRequest(new
            {
                error = ex.InnerException?.Message ?? ex.Message,
                detalle = ex.InnerException?.Message
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                error = ex.Message,
                detalle = ex.InnerException?.Message
            });
        }

        return Ok(new
        {
            mensaje = "Venta registrada correctamente.",
            ventaId = venta.Id,
            asientoId = venta.AsientoId
        });
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

    private async Task<int> RegistrarAsientoVenta(Venta venta, int cuentaClienteId, int cuentaVentasId, int cuentaIgvId)
    {
        var glosa = $"Venta {venta.TipoDocumento} {venta.Serie}-{venta.NumeroDocumento}";

        var asientoId = await ExecuteScalarIntAsync(
            """
            INSERT INTO dbo.AsientoContable
                (Fecha, TipoOperacion, ReferenciaId, Glosa, TotalDebe, TotalHaber, UsuarioId, FechaRegistro)
            VALUES
                (@Fecha, @TipoOperacion, @ReferenciaId, @Glosa, @TotalDebe, @TotalHaber, @UsuarioId, GETDATE());

            SELECT CAST(SCOPE_IDENTITY() AS int);
            """,
            ("@Fecha", venta.Fecha),
            ("@TipoOperacion", "VENTA"),
            ("@ReferenciaId", venta.Id),
            ("@Glosa", glosa),
            ("@TotalDebe", venta.Total),
            ("@TotalHaber", venta.Total),
            ("@UsuarioId", venta.UsuarioId));

        await _context.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO dbo.AsientoContableDetalle (AsientoId, CuentaId, Debe, Haber, Glosa)
            VALUES
                ({0}, {1}, {2}, 0, {7}),
                ({0}, {3}, 0, {4}, {7}),
                ({0}, {5}, 0, {6}, {7});
            """,
            asientoId,
            cuentaClienteId,
            venta.Total,
            cuentaVentasId,
            venta.SubTotal,
            cuentaIgvId,
            venta.IGV,
            glosa);

        return asientoId;
    }

    private async Task RegistrarMovimientoInventario(Venta venta, VentaDetalle detalle, int almacenId)
    {
        var stockAnterior = await _context.Database
            .SqlQueryRaw<int>(
                """
                SELECT ISNULL(
                    (SELECT StockActual FROM dbo.Inventario WHERE ProductoId = {0} AND AlmacenId = {1}),
                    0
                ) AS Value
                """,
                detalle.ProductoId,
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
                detalle.ProductoId,
                almacenId)
            .FirstAsync();

        if (stockAnterior < detalle.Cantidad)
            throw new InvalidOperationException($"Stock insuficiente para el producto {detalle.ProductoId}. Stock actual: {stockAnterior}.");

        var stockNuevo = stockAnterior - detalle.Cantidad;

        await _context.Database.ExecuteSqlRawAsync(
            """
            UPDATE dbo.Inventario
            SET StockActual = {2},
                UltimaActualizacion = GETDATE()
            WHERE ProductoId = {0}
              AND AlmacenId = {1};
            """,
            detalle.ProductoId,
            almacenId,
            stockNuevo);

        const string tipoMovimientoVenta = "VENTA";
        var referencia = $"{venta.TipoDocumento} {venta.Serie}-{venta.NumeroDocumento}";
        var tipoMovimientoId = await ResolverTipoMovimientoVentaId();
        if (tipoMovimientoId == null)
            throw new InvalidOperationException("No existe un tipo de movimiento activo con codigo VENTA.");

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
            ("@ProductoId", detalle.ProductoId),
            ("@AlmacenId", almacenId),
            ("@TipoMovimientoId", tipoMovimientoId.Value),
            ("@Documento", referencia),
            ("@DocumentoId", venta.Id),
            ("@Cantidad", detalle.Cantidad),
            ("@CostoUnitario", costoUnitario),
            ("@Observacion", venta.Observacion),
            ("@UsuarioId", venta.UsuarioId),
            ("@Fecha", venta.Fecha));

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
            ("@ProductoId", detalle.ProductoId),
            ("@AlmacenId", almacenId),
            ("@TipoMovimiento", tipoMovimientoVenta),
            ("@Referencia", referencia),
            ("@ReferenciaId", venta.Id),
            ("@Cantidad", detalle.Cantidad),
            ("@StockAnterior", stockAnterior),
            ("@StockNuevo", stockNuevo),
            ("@CostoUnitario", costoUnitario),
            ("@Fecha", venta.Fecha),
            ("@UsuarioId", venta.UsuarioId));

        await _context.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO dbo.KardexDetalle
                (MovimientoId, ProductoId, AlmacenId, TipoMovimiento, Documento, DocumentoId,
                 Entrada, Salida, StockAnterior, StockActual, CostoUnitario, CostoTotal, Fecha, UsuarioId)
            VALUES
                ({0}, {1}, {2}, {3}, {4}, {5}, 0, {6}, {7}, {8}, {9}, {10}, {11}, {12});
            """,
            movimientoInventarioId,
            detalle.ProductoId,
            almacenId,
            tipoMovimientoVenta,
            referencia,
            venta.Id,
            detalle.Cantidad,
            stockAnterior,
            stockNuevo,
            costoUnitario,
            costoUnitario * detalle.Cantidad,
            venta.Fecha,
            venta.UsuarioId);
    }

    private async Task<int?> ResolverTipoMovimientoVentaId()
    {
        var tipos = await _context.Database
            .SqlQueryRaw<int>(
                "SELECT TOP 1 Id AS Value FROM dbo.TiposMovimiento WHERE Codigo = {0} AND Tipo = {1} AND ISNULL(Activo, 1) = 1 ORDER BY Id",
                "VENTA",
                "SALIDA")
            .ToListAsync();

        return tipos.FirstOrDefault() == 0 ? null : tipos.First();
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
}
