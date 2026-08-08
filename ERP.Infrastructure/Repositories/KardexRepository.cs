using Dapper;
using ERP.Application.DTOs.Kardex;
using ERP.Application.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Data;

// Declaración

namespace ERP.Infrastructure.Repositories;

public class KardexRepository : IKardexRepository
{
    private readonly string _connectionString;
    public KardexRepository(IConfiguration configuration)
    {
        _connectionString =
            configuration.GetConnectionString("DefaultConnection")!;
    }
    private IDbConnection Connection
        => new SqlConnection(_connectionString);

    // Método auxiliar ConstruirWhere()

    private static string ConstruirWhere(
    KardexFiltroDto filtro,
    DynamicParameters parametros)
    {
        string where = " WHERE 1 = 1 ";

        if (filtro.ProductoId > 0)
        {
            where += " AND KD.ProductoId=@ProductoId ";

            parametros.Add(
                "ProductoId",
                filtro.ProductoId);
        }

        if (filtro.AlmacenId > 0)
        {
            where += " AND KD.AlmacenId=@AlmacenId ";

            parametros.Add(
                "AlmacenId",
                filtro.AlmacenId);
        }

        if (!string.IsNullOrWhiteSpace(
            filtro.TipoMovimiento))
        {
            where +=
                " AND KD.TipoMovimiento=@TipoMovimiento ";

            parametros.Add(
                "TipoMovimiento",
                filtro.TipoMovimiento);
        }

        if (filtro.FechaInicio.HasValue)
        {
            where +=
                " AND CAST(KD.Fecha AS DATE)>=@FechaInicio ";

            parametros.Add(
                "FechaInicio",
                filtro.FechaInicio.Value.Date);
        }

        if (filtro.FechaFin.HasValue)
        {
            where +=
                " AND CAST(KD.Fecha AS DATE)<=@FechaFin ";

            parametros.Add(
                "FechaFin",
                filtro.FechaFin.Value.Date);
        }

        return where;
    }

    // ObtenerResumenProducto()

    public async Task<KardexResumenDto>
ObtenerResumenProducto(
    int productoId,
    int almacenId)
    {
        using var cn = Connection;

        const string sql = @"

        SELECT

              P.Id                     ProductoId,

              P.Codigo,

              P.Nombre                 Descripcion,

              ISNULL(I.StockActual,0)  StockActual,

              ISNULL(I.CostoPromedio,0) CostoPromedio,

              ISNULL(I.StockActual,0)
              *
              ISNULL(I.CostoPromedio,0)
              AS ValorInventario,

              ISNULL(A.Nombre,'')      Almacen,

              (

                SELECT
                    ISNULL(SUM(KD.Entrada),0)

                FROM KardexDetalle KD

                WHERE KD.ProductoId=P.Id

                AND KD.AlmacenId=@AlmacenId

              ) Entradas,

              (

                SELECT
                    ISNULL(SUM(KD.Salida),0)

                FROM KardexDetalle KD

                WHERE KD.ProductoId=P.Id

                AND KD.AlmacenId=@AlmacenId

              ) Salidas

        FROM Productos P

        LEFT JOIN Inventario I

        ON I.ProductoId=P.Id

        AND I.AlmacenId=@AlmacenId

        LEFT JOIN Almacenes A

        ON A.Id=@AlmacenId

        WHERE P.Id=@ProductoId;
        ";

        var resumen =
            await cn.QueryFirstOrDefaultAsync
            <KardexResumenDto>(
                sql,
                new
                {
                    ProductoId = productoId,
                    AlmacenId = almacenId
                });

        if (resumen == null)
            throw new Exception(
                "Producto no encontrado.");

        return resumen;
    }

    public async Task<IEnumerable<KardexMovimientoDto>>
    ListarMovimientos(
        KardexFiltroDto filtro)
    {
        using var cn = Connection;

        var parametros = new DynamicParameters();

        string where = ConstruirWhere(
            filtro,
            parametros);

        string sql = $@"

        SELECT
              KD.Id,
              KD.ProductoId,
              P.Codigo                  CodigoProducto,
              P.Nombre                  Producto,
              KD.AlmacenId,
              A.Nombre                  Almacen,
              KD.TipoMovimiento,
              KD.Documento,
              KD.DocumentoId,
              KD.Entrada,
              KD.Salida,
              KD.StockAnterior,
              KD.StockActual,
              KD.CostoUnitario,
              KD.CostoTotal,
              KD.Fecha,
              KD.UsuarioId,
              ISNULL(U.Usuario,'')        Usuario

        FROM KardexDetalle KD
            INNER JOIN Productos P ON KD.ProductoId=P.Id
            INNER JOIN Almacenes A ON KD.AlmacenId=A.Id
            LEFT JOIN Usuarios U ON KD.UsuarioId=U.Id
        {where}
        ORDER BY
        KD.Fecha DESC,
        KD.Id DESC;
        ";

        return await cn.QueryAsync<KardexMovimientoDto>(
            sql,
            parametros);
    }

    public async Task<KardexDetalleDto?>
ObtenerDetalleMovimiento(
    long movimientoId)
    {
        using var cn = Connection;

        const string sql = @"

        SELECT
              KD.Id,
              KD.MovimientoId,
              KD.ProductoId,
              P.Codigo                     CodigoProducto,
              P.Nombre                     Producto,
              KD.AlmacenId,
              A.Nombre                     Almacen,
              KD.TipoMovimiento,
              KD.Documento,
              KD.DocumentoId,
              KD.Entrada,
              KD.Salida,
              KD.StockAnterior,
              KD.StockActual,
              KD.CostoUnitario,
              KD.CostoTotal,
              KD.Fecha,
              ISNULL(U.Usuario,'') Usuario
        FROM KardexDetalle KD 
            INNER JOIN Productos P ON KD.ProductoId=P.Id
            INNER JOIN Almacenes A ON KD.AlmacenId=A.Id
            LEFT JOIN Usuarios U ON KD.UsuarioId=U.Id
        WHERE KD.Id=@Id;
        ";

        return await cn.QueryFirstOrDefaultAsync<KardexDetalleDto>(
            sql,
            new
            {
                Id = movimientoId
            });
    }
    public async Task<IEnumerable<ProductoBusquedaDto>>
    BuscarProductos(string texto)
    {
        using var cn = Connection;

        const string sql = @"

        SELECT TOP (20)
              P.Id,
              P.Codigo,
              P.Nombre AS Descripcion,
              ISNULL(P.Stock,0) AS Stock,
              ISNULL(P.StockMinimo,0) AS StockMinimo
        FROM Productos P
        WHERE
        (
                P.Codigo LIKE '%' + @Texto + '%'
                OR
                P.Nombre LIKE '%' + @Texto + '%'
        )
        AND P.Activo = 1
        ORDER BY
        P.Nombre;
        ";

        return await cn.QueryAsync<ProductoBusquedaDto>(
            sql,
            new
            {
                Texto = texto ?? ""
            });
    }

    public async Task<IEnumerable<AlmacenDto>> ListarAlmacenes()
    {
        using var cn = Connection;
        const string sql = @"

        SELECT
            Id,
            Nombre
        FROM Almacenes
        ORDER BY Nombre;
        ";

        return await cn.QueryAsync<AlmacenDto>(sql);
    }

    public async Task<IEnumerable<TipoMovimientoDto>>
    ListarTiposMovimiento()
    {
        using var cn = Connection;
        const string sql = @"

        SELECT DISTINCT
               TipoMovimiento AS Nombre
        FROM KardexDetalle
        ORDER BY TipoMovimiento;
        ";
        return await cn.QueryAsync<TipoMovimientoDto>(sql);
    }
}