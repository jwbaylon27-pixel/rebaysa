using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using ERP.Application.Interfaces;
using ERP.Persistence.Context; // ApplicationDbContext

namespace ERP.Persistence.Repositories
{
    /// <summary>
    /// Adaptadores de solo lectura contra tablas de otros módulos: Compras, SocioNegocio
    /// (proveedores — tu ApplicationDbContext no mapea una tabla Proveedores separada),
    /// Productos y PlanCuentas. Se implementan con SQL crudo parametrizado en vez de LINQ
    /// sobre las entidades EF ya existentes, para mantener este adaptador desacoplado del
    /// resto del dominio; si prefieres, puedes cambiarlos por LINQ directo sobre
    /// _context.Set&lt;Compra&gt;(), _context.Set&lt;SocioNegocio&gt;(), etc. sin tocar las interfaces.
    /// </summary>
    public class CuentaContableLookupService : ICuentaContableLookupService
    {
        private readonly ApplicationDbContext _context;
        public CuentaContableLookupService(ApplicationDbContext context) => _context = context;

        public async Task<int> ObtenerIdPorCodigoAsync(string codigo)
        {
            var connection = _context.Database.GetDbConnection();
            var abrioConexion = await AsegurarConexionAbiertaAsync(connection);
            try
            {
                using var command = connection.CreateCommand();
                AsignarTransaccion(command);
                command.CommandText = "SELECT Id FROM dbo.PlanCuentas WHERE Codigo = @Codigo AND Activo = 1;";
                command.Parameters.Add(new SqlParameter("@Codigo", SqlDbType.VarChar, 20) { Value = codigo });

                var resultado = await command.ExecuteScalarAsync();
                if (resultado == null || resultado == DBNull.Value)
                    throw new InvalidOperationException($"No se encontró en PlanCuentas una cuenta activa con código '{codigo}'.");

                return Convert.ToInt32(resultado);
            }
            finally
            {
                if (abrioConexion) await connection.CloseAsync();
            }
        }

        private void AsignarTransaccion(IDbCommand command)
        {
            var tx = _context.Database.CurrentTransaction?.GetDbTransaction();
            if (tx != null) command.Transaction = tx;
        }

        private static async Task<bool> AsegurarConexionAbiertaAsync(System.Data.Common.DbConnection connection)
        {
            if (connection.State == ConnectionState.Open) return false;
            await connection.OpenAsync();
            return true;
        }
    }

    public class ProveedorConsultaService : IProveedorConsultaService
    {
        private readonly ApplicationDbContext _context;
        public ProveedorConsultaService(ApplicationDbContext context) => _context = context;

        public async Task<string?> ObtenerNombreAsync(int proveedorId)
        {
            var todos = await ObtenerNombresAsync(new[] { proveedorId });
            return todos.TryGetValue(proveedorId, out var nombre) ? nombre : null;
        }

        public async Task<Dictionary<int, string>> ObtenerNombresAsync(IEnumerable<int> proveedorIds)
        {
            var ids = proveedorIds.Distinct().ToList();
            var resultado = new Dictionary<int, string>();
            if (ids.Count == 0) return resultado;

            var connection = _context.Database.GetDbConnection();
            var abrioConexion = connection.State != ConnectionState.Open;
            if (abrioConexion) await connection.OpenAsync();

            try
            {
                using var command = connection.CreateCommand();
                var tx = _context.Database.CurrentTransaction?.GetDbTransaction();
                if (tx != null) command.Transaction = tx;

                var (clausulaIn, parametros) = ConstruirClausulaIn("Id", ids);
                // Tu ApplicationDbContext no mapea una tabla "Proveedores" independiente:
                // los proveedores son filas de SocioNegocio con TipoSocio = 'P'.
                command.CommandText = $"SELECT Id, Nombres FROM dbo.SocioNegocio WHERE TipoSocio = 'P' AND {clausulaIn};";
                command.Parameters.AddRange(parametros.ToArray());

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                    resultado[reader.GetInt32(0)] = reader.GetString(1);
            }
            finally
            {
                if (abrioConexion) await connection.CloseAsync();
            }

            return resultado;
        }

        private static (string clausula, List<SqlParameter> parametros) ConstruirClausulaIn(string columna, List<int> valores)
        {
            var nombres = valores.Select((_, i) => $"@p{i}").ToList();
            var parametros = valores.Select((v, i) => new SqlParameter($"@p{i}", SqlDbType.Int) { Value = v }).ToList();
            return ($"{columna} IN ({string.Join(",", nombres)})", parametros);
        }
    }

    public class ProductoConsultaService : IProductoConsultaService
    {
        private readonly ApplicationDbContext _context;
        public ProductoConsultaService(ApplicationDbContext context) => _context = context;

        public async Task<Dictionary<long, string>> ObtenerNombresAsync(IEnumerable<long> productoIds)
        {
            var ids = productoIds.Distinct().ToList();
            var resultado = new Dictionary<long, string>();
            if (ids.Count == 0) return resultado;

            var connection = _context.Database.GetDbConnection();
            var abrioConexion = connection.State != ConnectionState.Open;
            if (abrioConexion) await connection.OpenAsync();

            try
            {
                using var command = connection.CreateCommand();
                var tx = _context.Database.CurrentTransaction?.GetDbTransaction();
                if (tx != null) command.Transaction = tx;

                var nombresParam = ids.Select((_, i) => $"@p{i}").ToList();
                for (int i = 0; i < ids.Count; i++)
                    command.Parameters.Add(new SqlParameter($"@p{i}", SqlDbType.Int) { Value = checked((int)ids[i]) });

                command.CommandText = $"SELECT Id, Nombre FROM dbo.Productos WHERE Id IN ({string.Join(",", nombresParam)});";

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                    resultado[reader.GetInt32(0)] = reader.GetString(1);
            }
            finally
            {
                if (abrioConexion) await connection.CloseAsync();
            }

            return resultado;
        }
    }

    /// <summary>
    /// Lee Compras/CompraDetalle/Productos para dar soporte a la Liquidación de Costo.
    /// PesoTotal/VolumenTotal se calculan desde Productos.Peso/Volumen * Cantidad, ya que
    /// CompraDetalle no guarda esos datos directamente.
    /// </summary>
    public class CompraLandedCostDataProvider : ICompraLandedCostDataProvider
    {
        private readonly ApplicationDbContext _context;
        public CompraLandedCostDataProvider(ApplicationDbContext context) => _context = context;

        public async Task<CompraResumenDto?> ObtenerResumenAsync(int compraId)
        {
            var todos = await ObtenerResumenesAsync(new[] { compraId });
            return todos.FirstOrDefault();
        }

        public async Task<List<CompraResumenDto>> ObtenerResumenesAsync(IEnumerable<int> compraIds)
        {
            var ids = compraIds.Distinct().ToList();
            var resultado = new List<CompraResumenDto>();
            if (ids.Count == 0) return resultado;

            var connection = _context.Database.GetDbConnection();
            var abrioConexion = connection.State != ConnectionState.Open;
            if (abrioConexion) await connection.OpenAsync();

            try
            {
                using var command = connection.CreateCommand();
                var tx = _context.Database.CurrentTransaction?.GetDbTransaction();
                if (tx != null) command.Transaction = tx;

                var nombresParam = ids.Select((_, i) => $"@p{i}").ToList();
                for (int i = 0; i < ids.Count; i++)
                    command.Parameters.Add(new SqlParameter($"@p{i}", SqlDbType.Int) { Value = ids[i] });

                command.CommandText = $@"
SELECT
    C.Id,
    S.Nombres,
    LTRIM(RTRIM(
        ISNULL(C.TipoDocumento,'') + ' ' + ISNULL(C.Serie,'') + '-' + ISNULL(C.NumeroDocumento,'')
    )) AS Documento,
    C.Total
FROM dbo.Compras C
INNER JOIN dbo.SocioNegocio S ON S.Id = C.ProveedorId
WHERE C.Id IN ({string.Join(",", nombresParam)});";

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    resultado.Add(new CompraResumenDto
                    {
                        CompraId = reader.GetInt32(0),
                        Proveedor = reader.GetString(1),
                        Documento = reader.GetString(2),
                        Total = reader.GetDecimal(3)
                    });
                }
            }
            finally
            {
                if (abrioConexion) await connection.CloseAsync();
            }

            return resultado;
        }

        public async Task<List<CompraLineaDto>> ObtenerLineasAsync(IEnumerable<int> compraIds)
        {
            var ids = compraIds.Distinct().ToList();
            var resultado = new List<CompraLineaDto>();
            if (ids.Count == 0) return resultado;

            var connection = _context.Database.GetDbConnection();
            var abrioConexion = connection.State != ConnectionState.Open;
            if (abrioConexion) await connection.OpenAsync();

            try
            {
                using var command = connection.CreateCommand();
                var tx = _context.Database.CurrentTransaction?.GetDbTransaction();
                if (tx != null) command.Transaction = tx;

                var nombresParam = ids.Select((_, i) => $"@p{i}").ToList();
                for (int i = 0; i < ids.Count; i++)
                    command.Parameters.Add(new SqlParameter($"@p{i}", SqlDbType.Int) { Value = ids[i] });

                // PesoTotal/VolumenTotal = Producto.Peso/Volumen (por unidad) * Cantidad de la línea.
                command.CommandText = $@"
SELECT
    CD.Id,
    CD.CompraId,
    CD.ProductoId,
    P.Nombre,
    CD.Cantidad,
    CD.PrecioUnitario,
    CD.Total,
    (P.Peso * CD.Cantidad)    AS PesoTotal,
    (P.Volumen * CD.Cantidad) AS VolumenTotal
FROM dbo.CompraDetalle CD
INNER JOIN dbo.Productos P ON P.Id = CD.ProductoId
WHERE CD.CompraId IN ({string.Join(",", nombresParam)});";

                using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    resultado.Add(new CompraLineaDto
                    {
                        CompraDetalleId = reader.GetInt32(0),
                        CompraId = reader.GetInt32(1),
                        ProductoId = reader.GetInt32(2),
                        ProductoNombre = reader.GetString(3),
                        Cantidad = reader.GetInt32(4), // CompraDetalle.Cantidad es int en el esquema real
                        CostoUnitario = reader.GetDecimal(5),
                        ValorLinea = reader.GetDecimal(6),
                        PesoTotal = reader.GetDecimal(7),
                        VolumenTotal = reader.GetDecimal(8)
                    });
                }
            }
            finally
            {
                if (abrioConexion) await connection.CloseAsync();
            }

            return resultado;
        }
    }
}
