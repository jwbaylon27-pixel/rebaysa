using System;
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
    /// Implementación de <see cref="IInventarioRevaluacionService"/> que llama a
    /// <c>dbo.sp_LC_RevalorizarCostoPromedio</c>, reutilizando la conexión/transacción
    /// del <see cref="ApplicationDbContext"/> para que participe del mismo commit/rollback
    /// que <c>LiquidacionCostoService.ConfirmarAsync</c>.
    /// </summary>
    public class InventarioRevaluacionService : IInventarioRevaluacionService
    {
        private readonly ApplicationDbContext _context;

        public InventarioRevaluacionService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<RevaluacionResultadoDto> RevalorizarAsync(
            long liquidacionCostoId, long productoId, int almacenId, decimal costoAsignado, int usuarioId)
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
                using var command = connection.CreateCommand();
                command.CommandText = "dbo.sp_LC_RevalorizarCostoPromedio";
                command.CommandType = CommandType.StoredProcedure;
                if (transaccionActual != null)
                    command.Transaction = transaccionActual;

                command.Parameters.Add(new SqlParameter("@LiquidacionCostoId", SqlDbType.BigInt) { Value = liquidacionCostoId });
                command.Parameters.Add(new SqlParameter("@ProductoId", SqlDbType.Int) { Value = checked((int)productoId) });
                command.Parameters.Add(new SqlParameter("@AlmacenId", SqlDbType.Int) { Value = almacenId });
                command.Parameters.Add(new SqlParameter("@CostoAsignado", SqlDbType.Decimal) { Precision = 18, Scale = 6, Value = costoAsignado });
                command.Parameters.Add(new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = usuarioId });

                var pCostoAnterior = new SqlParameter("@CostoPromedioAnterior", SqlDbType.Decimal) { Precision = 18, Scale = 6, Direction = ParameterDirection.Output };
                var pCostoNuevo = new SqlParameter("@CostoPromedioNuevo", SqlDbType.Decimal) { Precision = 18, Scale = 6, Direction = ParameterDirection.Output };
                var pStockActual = new SqlParameter("@StockActual", SqlDbType.Decimal) { Precision = 18, Scale = 2, Direction = ParameterDirection.Output };
                var pMovimientoId = new SqlParameter("@MovimientoId", SqlDbType.BigInt) { Direction = ParameterDirection.Output };

                command.Parameters.Add(pCostoAnterior);
                command.Parameters.Add(pCostoNuevo);
                command.Parameters.Add(pStockActual);
                command.Parameters.Add(pMovimientoId);

                try
                {
                    await command.ExecuteNonQueryAsync();
                }
                catch (SqlException ex) when (ex.Number >= 50000)
                {
                    // sp_LC_RevalorizarCostoPromedio / sp_MovimientoInventario usan THROW para
                    // errores de negocio (producto/almacén/tipo de movimiento inválido, etc.).
                    throw new InvalidOperationException(
                        $"No se pudo revalorizar el producto {productoId} en el almacén {almacenId}: {ex.Message}", ex);
                }

                return new RevaluacionResultadoDto
                {
                    ProductoId = productoId,
                    CostoPromedioAnterior = pCostoAnterior.Value == DBNull.Value ? 0m : Convert.ToDecimal(pCostoAnterior.Value),
                    CostoPromedioNuevo = pCostoNuevo.Value == DBNull.Value ? 0m : Convert.ToDecimal(pCostoNuevo.Value),
                    StockActual = pStockActual.Value == DBNull.Value ? 0m : Convert.ToDecimal(pStockActual.Value),
                    MovimientoId = pMovimientoId.Value == DBNull.Value ? null : Convert.ToInt64(pMovimientoId.Value)
                };
            }
            finally
            {
                if (abrioConexion)
                    await connection.CloseAsync();
            }
        }
    }
}
