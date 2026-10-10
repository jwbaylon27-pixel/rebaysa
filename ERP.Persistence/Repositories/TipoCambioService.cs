using System;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using ERP.Application.Interfaces;
using ERP.Persistence.Context;

namespace ERP.Persistence.Repositories
{
    /// <summary>
    /// Implementación de <see cref="ITipoCambioService"/> contra dbo.TipoCambioDiario,
    /// via sp_ObtenerTipoCambio / sp_RegistrarTipoCambio. Reutiliza la conexión/transacción
    /// del ApplicationDbContext, para poder participar de transacciones ya abiertas por
    /// quien la llame (p. ej. al registrar una compra).
    /// </summary>
    public class TipoCambioService : ITipoCambioService
    {
        private readonly ApplicationDbContext _context;

        public TipoCambioService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<decimal> ObtenerAsync(DateTime fecha)
        {
            var connection = (SqlConnection)_context.Database.GetDbConnection();
            var abrioConexion = connection.State != ConnectionState.Open;
            if (abrioConexion) await connection.OpenAsync();

            try
            {
                using var command = connection.CreateCommand();
                var tx = _context.Database.CurrentTransaction?.GetDbTransaction() as SqlTransaction;
                if (tx != null) command.Transaction = tx;

                command.CommandText = "dbo.sp_ObtenerTipoCambio";
                command.CommandType = CommandType.StoredProcedure;
                command.Parameters.Add(new SqlParameter("@Fecha", SqlDbType.Date) { Value = fecha.Date });

                var pTipoCambio = new SqlParameter("@TipoCambio", SqlDbType.Decimal)
                {
                    Precision = 9,
                    Scale = 4,
                    Direction = ParameterDirection.Output
                };
                command.Parameters.Add(pTipoCambio);

                try
                {
                    await command.ExecuteNonQueryAsync();
                }
                catch (SqlException ex) when (ex.Number >= 50000)
                {
                    throw new InvalidOperationException(ex.Message, ex);
                }

                return pTipoCambio.Value == DBNull.Value ? 0m : Convert.ToDecimal(pTipoCambio.Value);
            }
            finally
            {
                if (abrioConexion) await connection.CloseAsync();
            }
        }

        public async Task RegistrarAsync(DateTime fecha, decimal tipoCambio, int usuarioId)
        {
            var connection = (SqlConnection)_context.Database.GetDbConnection();
            var abrioConexion = connection.State != ConnectionState.Open;
            if (abrioConexion) await connection.OpenAsync();

            try
            {
                using var command = connection.CreateCommand();
                var tx = _context.Database.CurrentTransaction?.GetDbTransaction() as SqlTransaction;
                if (tx != null) command.Transaction = tx;

                command.CommandText = "dbo.sp_RegistrarTipoCambio";
                command.CommandType = CommandType.StoredProcedure;
                command.Parameters.Add(new SqlParameter("@Fecha", SqlDbType.Date) { Value = fecha.Date });
                command.Parameters.Add(new SqlParameter("@TipoCambio", SqlDbType.Decimal) { Precision = 9, Scale = 4, Value = tipoCambio });
                command.Parameters.Add(new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = usuarioId });

                try
                {
                    await command.ExecuteNonQueryAsync();
                }
                catch (SqlException ex) when (ex.Number >= 50000)
                {
                    throw new InvalidOperationException(ex.Message, ex);
                }
            }
            finally
            {
                if (abrioConexion) await connection.CloseAsync();
            }
        }
    }
}
