using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using ERP.Application.Interfaces;
using ERP.Persistence.Context; // ApplicationDbContext

namespace ERP.Persistence.Repositories
{
    /// <summary>
    /// Implementación de <see cref="IAsientoContableGeneralService"/>. Inserta directamente en
    /// las tablas genéricas dbo.AsientoContable / dbo.AsientoContableDetalle (sin pasar por el
    /// motor de dbo.ReglasContables, que solo admite montos fijos como SUBTOTAL/IGV/TOTAL/COSTO
    /// y no un número variable de conceptos con cuentas propias). Reutiliza la conexión y la
    /// transacción del ApplicationDbContext para participar del mismo commit/rollback que
    /// LiquidacionCostoService.ConfirmarAsync.
    /// </summary>
    public class AsientoContableGeneralService : IAsientoContableGeneralService
    {
        private readonly ApplicationDbContext _context;

        public AsientoContableGeneralService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<int> RegistrarAsientoAsync(
            DateTime fecha, string tipoOperacion, long referenciaId, string? glosa,
            decimal totalDebe, decimal totalHaber, int? usuarioId,
            IEnumerable<LineaAsientoContableDto> detalles)
        {
            var connection = (SqlConnection)_context.Database.GetDbConnection();
            var abrioConexion = false;

            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
                abrioConexion = true;
            }

            var transaccionActual = _context.Database.CurrentTransaction?.GetDbTransaction() as SqlTransaction;

            try
            {
                int asientoId;

                using (var command = connection.CreateCommand())
                {
                    if (transaccionActual != null)
                        command.Transaction = transaccionActual;

                    command.CommandText = @"
INSERT INTO dbo.AsientoContable
    (Fecha, TipoOperacion, ReferenciaId, Glosa, TotalDebe, TotalHaber, UsuarioId, FechaRegistro)
OUTPUT INSERTED.Id
VALUES (@Fecha, @TipoOperacion, @ReferenciaId, @Glosa, @TotalDebe, @TotalHaber, @UsuarioId, GETDATE());";

                    command.Parameters.Add(new SqlParameter("@Fecha", SqlDbType.DateTime) { Value = fecha });
                    command.Parameters.Add(new SqlParameter("@TipoOperacion", SqlDbType.VarChar, 20) { Value = tipoOperacion });
                    // AsientoContable.ReferenciaId es INT; si LiquidacionCostoId excediera el
                    // rango de int (poco probable en la práctica) esto lanzaría overflow.
                    command.Parameters.Add(new SqlParameter("@ReferenciaId", SqlDbType.Int) { Value = checked((int)referenciaId) });
                    command.Parameters.Add(new SqlParameter("@Glosa", SqlDbType.VarChar, 500) { Value = (object?)glosa ?? DBNull.Value });
                    command.Parameters.Add(new SqlParameter("@TotalDebe", SqlDbType.Decimal) { Precision = 18, Scale = 2, Value = totalDebe });
                    command.Parameters.Add(new SqlParameter("@TotalHaber", SqlDbType.Decimal) { Precision = 18, Scale = 2, Value = totalHaber });
                    command.Parameters.Add(new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = (object?)usuarioId ?? DBNull.Value });

                    var resultado = await command.ExecuteScalarAsync();
                    asientoId = Convert.ToInt32(resultado);
                }

                foreach (var detalle in detalles)
                {
                    using var command = connection.CreateCommand();
                    if (transaccionActual != null)
                        command.Transaction = transaccionActual;

                    command.CommandText = @"
INSERT INTO dbo.AsientoContableDetalle (AsientoId, CuentaId, Debe, Haber, Glosa)
VALUES (@AsientoId, @CuentaId, @Debe, @Haber, @Glosa);";

                    command.Parameters.Add(new SqlParameter("@AsientoId", SqlDbType.Int) { Value = asientoId });
                    command.Parameters.Add(new SqlParameter("@CuentaId", SqlDbType.Int) { Value = detalle.CuentaId });
                    command.Parameters.Add(new SqlParameter("@Debe", SqlDbType.Decimal) { Precision = 18, Scale = 2, Value = detalle.Debe });
                    command.Parameters.Add(new SqlParameter("@Haber", SqlDbType.Decimal) { Precision = 18, Scale = 2, Value = detalle.Haber });
                    command.Parameters.Add(new SqlParameter("@Glosa", SqlDbType.VarChar, 250) { Value = (object?)detalle.Glosa ?? DBNull.Value });

                    await command.ExecuteNonQueryAsync();
                }

                return asientoId;
            }
            finally
            {
                if (abrioConexion)
                    await connection.CloseAsync();
            }
        }
    }
}
