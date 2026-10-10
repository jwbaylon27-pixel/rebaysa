namespace ERP.Infrastructure.Repositories;

using Dapper;
using ERP.Application.DTOs.Reportes;
using ERP.Application.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Data;

public class ReportesRepository : IReportesRepository
{
    private readonly string _connectionString;

    public ReportesRepository(IConfiguration configuration)
    {
        _connectionString =
            configuration.GetConnectionString("DefaultConnection")!;
    }

    private IDbConnection Connection => new SqlConnection(_connectionString);

    public async Task<IEnumerable<RegistroVentaDto>> ReporteRegistroVentas(
        DateTime? fechaInicio,
        DateTime? fechaFin)
    {
        using var cn = Connection;

        var parametros = new DynamicParameters();
        parametros.Add("FechaInicio", fechaInicio?.Date);
        parametros.Add("FechaFin", fechaFin?.Date);

        return await cn.QueryAsync<RegistroVentaDto>(
            "dbo.sp_ReporteRegistroVentas",
            parametros,
            commandType: CommandType.StoredProcedure);
    }
}