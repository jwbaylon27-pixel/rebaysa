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
public class PagosVentaController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PagosVentaController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET /api/PagosVenta/pendientes
    // Lista las facturas de venta al credito con saldo pendiente (total o parcial).
    [HttpGet("pendientes")]
    public async Task<IActionResult> ListarPendientes()
    {
        var ventasCredito = await _context.Ventas
            .Include(v => v.Cliente)
            .Where(v => v.MetodoPago == "CREDITO" && v.Estado == "REGISTRADO")
            .ToListAsync();

        var pagos = await _context.PagosVenta
            .GroupBy(p => p.VentaId)
            .Select(g => new { VentaId = g.Key, Total = g.Sum(p => p.Monto) })
            .ToListAsync();

        var pagosPorVenta = pagos.ToDictionary(p => p.VentaId, p => p.Total);

        var hoy = DateTime.Today;

        var pendientes = ventasCredito
            .Select(v =>
            {
                var pagado = pagosPorVenta.TryGetValue(v.Id, out var monto) ? monto : 0m;
                var saldo = v.Total - pagado;
                var diasVencido = v.FechaVencimiento.HasValue
                    ? (hoy - v.FechaVencimiento.Value.Date).Days
                    : (int?)null;

                return new VentaPendienteDto(
                    v.Id,
                    v.Fecha,
                    v.TipoDocumento,
                    v.Serie,
                    v.NumeroDocumento,
                    v.ClienteId,
                    v.Cliente != null ? v.Cliente.Nombres : string.Empty,
                    v.Total,
                    pagado,
                    saldo,
                    v.DiasCredito,
                    v.FechaVencimiento,
                    diasVencido ?? -9999
                );
            })
            .Where(d => d.SaldoPendiente > 0.005m)
            .OrderBy(d => d.FechaVencimiento)
            .ToList();

        return Ok(pendientes);
    }

    // GET /api/PagosVenta/venta/5
    // Historial de pagos de una venta especifica.
    [HttpGet("venta/{ventaId:int}")]
    public async Task<IActionResult> ListarPorVenta(int ventaId)
    {
        var pagos = await _context.PagosVenta
            .Where(p => p.VentaId == ventaId)
            .OrderByDescending(p => p.Fecha)
            .Select(p => new PagoVentaDto(p.Id, p.VentaId, p.Fecha, p.Monto, p.MetodoPago, p.Observacion, p.AsientoId))
            .ToListAsync();

        return Ok(pagos);
    }

    // POST /api/PagosVenta/venta/5
    // Registra un cobro (total o parcial) contra una venta al credito.
    [HttpPost("venta/{ventaId:int}")]
    public async Task<IActionResult> RegistrarPago(int ventaId, RegistrarPagoVentaDto request)
    {
        var venta = await _context.Ventas
            .Include(v => v.Cliente)
            .FirstOrDefaultAsync(v => v.Id == ventaId);

        if (venta == null)
            return NotFound(new { error = "La venta no existe." });

        if (!string.Equals(venta.MetodoPago, "CREDITO", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Esta venta no fue registrada al credito." });

        if (venta.Estado == "ANULADO")
            return BadRequest(new { error = "La venta esta anulada." });

        if (venta.Cliente == null)
            return BadRequest(new { error = "La venta no tiene un cliente asociado." });

        if (request.Monto <= 0)
            return BadRequest(new { error = "El monto debe ser mayor a cero." });

        var metodoPago = string.Equals(request.MetodoPago, "TRANSFERENCIA", StringComparison.OrdinalIgnoreCase)
            ? "TRANSFERENCIA"
            : "EFECTIVO";

        var codigoCuentaIngreso = metodoPago == "TRANSFERENCIA" ? "104" : "101";

        var yaPagado = await _context.PagosVenta
            .Where(p => p.VentaId == ventaId)
            .SumAsync(p => (decimal?)p.Monto) ?? 0m;

        var saldoPendiente = venta.Total - yaPagado;

        if (saldoPendiente <= 0.005m)
            return BadRequest(new { error = "Esta factura ya esta pagada en su totalidad." });

        if (request.Monto > saldoPendiente + 0.005m)
            return BadRequest(new
            {
                error = $"El monto ({request.Monto:F2}) supera el saldo pendiente ({saldoPendiente:F2})."
            });

        var usuarioId = await ResolverUsuarioId(request.UsuarioId);
        if (usuarioId == null)
            return BadRequest(new { error = "No hay usuarios registrados para asociar el cobro." });

        var cuentaClienteId = await ResolverCuentaId("121");
        var cuentaIngresoId = await ResolverCuentaId(codigoCuentaIngreso);
        if (cuentaClienteId == null || cuentaIngresoId == null)
            return BadRequest(new { error = $"Faltan cuentas contables activas (121, {codigoCuentaIngreso})." });

        var fecha = request.Fecha ?? DateTime.UtcNow;

        var pago = new PagoVenta
        {
            VentaId = ventaId,
            Fecha = fecha,
            Monto = request.Monto,
            MetodoPago = metodoPago,
            Observacion = request.Observacion,
            UsuarioId = usuarioId.Value
        };

        try
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            _context.PagosVenta.Add(pago);
            await _context.SaveChangesAsync();

            var glosa = $"Cobro venta {venta.TipoDocumento} {venta.Serie}-{venta.NumeroDocumento}";

            var asientoId = await ExecuteScalarIntAsync(
                """
                INSERT INTO dbo.AsientoContable
                    (Fecha, TipoOperacion, ReferenciaId, Glosa, TotalDebe, TotalHaber, UsuarioId, FechaRegistro)
                VALUES
                    (@Fecha, @TipoOperacion, @ReferenciaId, @Glosa, @Total, @Total, @UsuarioId, GETDATE());

                SELECT CAST(SCOPE_IDENTITY() AS int);
                """,
                ("@Fecha", fecha),
                ("@TipoOperacion", "COBRO"),
                ("@ReferenciaId", pago.Id),
                ("@Glosa", glosa),
                ("@Total", pago.Monto),
                ("@UsuarioId", usuarioId.Value));

            await _context.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO dbo.AsientoContableDetalle (AsientoId, CuentaId, Debe, Haber, Glosa)
                VALUES
                    ({0}, {1}, {2}, 0, {4}),
                    ({0}, {3}, 0, {2}, {4});
                """,
                asientoId,
                cuentaIngresoId.Value,
                pago.Monto,
                cuentaClienteId.Value,
                glosa);

            pago.AsientoId = asientoId;

            // Reducir el saldo pendiente del cliente
            venta.Cliente.Saldo = venta.Cliente.Saldo - pago.Monto;
            if (venta.Cliente.Saldo < 0)
                venta.Cliente.Saldo = 0;

            // Si con este pago la factura queda completamente cancelada, marcarla
            var totalPagadoAcumulado = yaPagado + pago.Monto;
            if (venta.Total - totalPagadoAcumulado <= 0.005m)
                venta.Estado = "PAGADO";

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message, detalle = ex.InnerException?.Message });
        }

        var nuevoSaldoPendiente = saldoPendiente - request.Monto;

        return Ok(new
        {
            mensaje = nuevoSaldoPendiente <= 0.005m ? "Factura cancelada por completo." : "Cobro registrado (pago parcial).",
            pagoId = pago.Id,
            asientoId = pago.AsientoId,
            saldoPendiente = Math.Max(nuevoSaldoPendiente, 0),
            facturaPagada = nuevoSaldoPendiente <= 0.005m
        });
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