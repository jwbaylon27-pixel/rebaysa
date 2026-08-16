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
[Authorize(Roles = "ADMINISTRADOR,ALMACENERO")]
public class ComprasController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ComprasController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> Registrar([FromBody] RegistrarCompraDto dto)
    {
        var usuarioId = await ResolverUsuarioId(dto.UsuarioId);
        if (usuarioId == null)
            return BadRequest(new { error = "No hay usuarios registrados para asociar la compra." });

        var proveedor = await _context.SociosNegocio
            .FirstOrDefaultAsync(s => s.Id == dto.ProveedorId && s.TipoSocio == "P" && s.Activo);
        if (proveedor == null)
            return BadRequest(new { error = "Selecciona un proveedor activo." });

        if (dto.Detalles.Count == 0)
            return BadRequest(new { error = "Debe agregar al menos un producto." });

        decimal subTotal = 0;
        var detalles = new List<CompraDetalle>();

        foreach (var item in dto.Detalles)
        {
            var producto = await _context.Productos
                .FirstOrDefaultAsync(p => p.Id == item.ProductoId && p.Activo);
            if (producto == null)
                return BadRequest(new { error = $"El producto con Id {item.ProductoId} no esta activo." });

            if (item.Cantidad <= 0 || item.PrecioUnitario < 0 || item.Descuento < 0)
                return BadRequest(new { error = "La cantidad, el precio y el descuento deben ser validos." });

            var totalDetalle = item.Cantidad * item.PrecioUnitario - item.Descuento;
            if (totalDetalle < 0)
                return BadRequest(new { error = "El descuento no puede superar el importe del detalle." });

            subTotal += totalDetalle;
            detalles.Add(new CompraDetalle
            {
                ProductoId = item.ProductoId,
                Cantidad = item.Cantidad,
                PrecioUnitario = item.PrecioUnitario,
                Descuento = item.Descuento,
                Total = totalDetalle
            });
        }

        var igv = decimal.Round(subTotal * 0.18m, 2);
        var total = subTotal + igv;
        var almacenId = await ResolverAlmacenId();
        if (almacenId == null)
            return BadRequest(new { error = "No hay almacenes activos para registrar inventario." });

        var cuentaComprasId = await ResolverCuentaId("60111");
        var cuentaIgvId = await ResolverCuentaId("40112");
        var cuentaProveedorId = await ResolverCuentaId("421");
        if (cuentaComprasId == null || cuentaIgvId == null || cuentaProveedorId == null)
            return BadRequest(new { error = "Faltan cuentas contables activas para registrar el asiento de compra (60111, 40112, 421)." });

        var compra = new Compra
        {
            ProveedorId = dto.ProveedorId,
            UsuarioId = usuarioId.Value,
            Fecha = dto.Fecha == default ? DateTime.UtcNow : dto.Fecha,
            TipoDocumento = string.IsNullOrWhiteSpace(dto.TipoDocumento) ? "FACTURA" : dto.TipoDocumento,
            Serie = dto.Serie,
            NumeroDocumento = dto.NumeroDocumento,
            SubTotal = subTotal,
            IGV = igv,
            Total = total,
            Observacion = dto.Observacion,
            Estado = "REGISTRADO",
            Detalles = detalles
        };

        try
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            _context.Compras.Add(compra);
            await _context.SaveChangesAsync();

            var asientoId = await RegistrarAsientoCompra(
                compra,
                cuentaComprasId.Value,
                cuentaIgvId.Value,
                cuentaProveedorId.Value);

            compra.AsientoId = asientoId;
            await _context.SaveChangesAsync();

            foreach (var detalle in compra.Detalles)
            {
                await RegistrarMovimientoInventario(compra, detalle, almacenId.Value);
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
            mensaje = "Compra registrada correctamente.",
            compraId = compra.Id,
            asientoId = compra.AsientoId
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

    private async Task<int> RegistrarAsientoCompra(Compra compra, int cuentaComprasId, int cuentaIgvId, int cuentaProveedorId)
    {
        var glosa = $"Compra {compra.TipoDocumento} {compra.Serie}-{compra.NumeroDocumento}";

        var asientoId = await ExecuteScalarIntAsync(
            """
            INSERT INTO dbo.AsientoContable
                (Fecha, TipoOperacion, ReferenciaId, Glosa, TotalDebe, TotalHaber, UsuarioId, FechaRegistro)
            VALUES
                (@Fecha, @TipoOperacion, @ReferenciaId, @Glosa, @TotalDebe, @TotalHaber, @UsuarioId, GETDATE());

            SELECT CAST(SCOPE_IDENTITY() AS int);
            """,
            ("@Fecha", compra.Fecha),
            ("@TipoOperacion", "COMPRA"),
            ("@ReferenciaId", compra.Id),
            ("@Glosa", glosa),
            ("@TotalDebe", compra.Total),
            ("@TotalHaber", compra.Total),
            ("@UsuarioId", compra.UsuarioId));

        await _context.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO dbo.AsientoContableDetalle (AsientoId, CuentaId, Debe, Haber, Glosa)
            VALUES
                ({0}, {1}, {2}, 0, {5}),
                ({0}, {3}, {4}, 0, {5}),
                ({0}, {6}, 0, {7}, {5});
            """,
            asientoId,
            cuentaComprasId,
            compra.SubTotal,
            cuentaIgvId,
            compra.IGV,
            glosa,
            cuentaProveedorId,
            compra.Total);

        return asientoId;
    }

    private async Task RegistrarMovimientoInventario(Compra compra, CompraDetalle detalle, int almacenId)
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

        var costoAnterior = await _context.Database
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

        var existeInventario = await _context.Database
            .SqlQueryRaw<int>(
                "SELECT COUNT(1) AS Value FROM dbo.Inventario WHERE ProductoId = {0} AND AlmacenId = {1}",
                detalle.ProductoId,
                almacenId)
            .FirstAsync();

        var stockNuevo = stockAnterior + detalle.Cantidad;
        var costoUnitario = decimal.Round(detalle.Total / detalle.Cantidad, 2);
        var costoPromedio = stockNuevo == 0
            ? costoUnitario
            : decimal.Round(((stockAnterior * costoAnterior) + (detalle.Cantidad * costoUnitario)) / stockNuevo, 2);

        if (existeInventario > 0)
        {
            await _context.Database.ExecuteSqlRawAsync(
                """
                UPDATE dbo.Inventario
                SET StockActual = {2},
                    CostoPromedio = {3},
                    UltimaActualizacion = GETDATE()
                WHERE ProductoId = {0}
                  AND AlmacenId = {1};
                """,
                detalle.ProductoId,
                almacenId,
                stockNuevo,
                costoPromedio);
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
                detalle.ProductoId,
                almacenId,
                stockNuevo,
                costoPromedio);
        }

        const string tipoMovimientoCompra = "COMPRA";
        var referencia = $"{compra.TipoDocumento} {compra.Serie}-{compra.NumeroDocumento}";
        var tipoMovimientoId = await ResolverTipoMovimientoCompraId();
        if (tipoMovimientoId == null)
            throw new InvalidOperationException("No existe un tipo de movimiento activo con codigo COMPRA.");

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
            ("@DocumentoId", compra.Id),
            ("@Cantidad", detalle.Cantidad),
            ("@CostoUnitario", costoUnitario),
            ("@Observacion", compra.Observacion),
            ("@UsuarioId", compra.UsuarioId),
            ("@Fecha", compra.Fecha));

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
            ("@TipoMovimiento", tipoMovimientoCompra),
            ("@Referencia", referencia),
            ("@ReferenciaId", compra.Id),
            ("@Cantidad", detalle.Cantidad),
            ("@StockAnterior", stockAnterior),
            ("@StockNuevo", stockNuevo),
            ("@CostoUnitario", costoUnitario),
            ("@Fecha", compra.Fecha),
            ("@UsuarioId", compra.UsuarioId));

        await _context.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO dbo.KardexDetalle
                (MovimientoId, ProductoId, AlmacenId, TipoMovimiento, Documento, DocumentoId,
                 Entrada, Salida, StockAnterior, StockActual, CostoUnitario, CostoTotal, Fecha, UsuarioId)
            VALUES
                ({0}, {1}, {2}, {3}, {4}, {5}, {6}, 0, {7}, {8}, {9}, {10}, {11}, {12});
            """,
            movimientoInventarioId,
            detalle.ProductoId,
            almacenId,
            tipoMovimientoCompra,
            referencia,
            compra.Id,
            detalle.Cantidad,
            stockAnterior,
            stockNuevo,
            costoUnitario,
            detalle.Total,
            compra.Fecha,
            compra.UsuarioId);
    }

    private async Task<int?> ResolverTipoMovimientoCompraId()
    {
        var tipos = await _context.Database
            .SqlQueryRaw<int>(
                "SELECT TOP 1 Id AS Value FROM dbo.TiposMovimiento WHERE Codigo = {0} AND Tipo = {1} AND ISNULL(Activo, 1) = 1 ORDER BY Id",
                "COMPRA",
                "ENTRADA")
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

    private async Task<int?> ResolverUsuarioId(int usuarioId)
    {
        if (usuarioId > 0)
        {
            var existeUsuario = await _context.Database
                .SqlQueryRaw<int>("SELECT COUNT(1) AS Value FROM dbo.Usuarios WHERE Id = {0}", usuarioId)
                .FirstAsync();

            if (existeUsuario > 0)
                return usuarioId;
        }

        var usuarios = await _context.Database
            .SqlQueryRaw<int>("SELECT TOP 1 Id AS Value FROM dbo.Usuarios ORDER BY Id")
            .ToListAsync();

        return usuarios.FirstOrDefault() == 0 ? null : usuarios.First();
    }
}
