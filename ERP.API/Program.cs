using ERP.Application.Interfaces;
using ERP.Application.Services;
using ERP.Infrastructure.Repositories;
using ERP.Persistence.Context;
using ERP.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddScoped<IProductoRepository, ProductoRepository>();
builder.Services.AddScoped<IKardexRepository, KardexRepository>();
builder.Services.AddScoped<IKardexService, KardexService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
builder.Configuration.GetConnectionString("DefaultConnection")
    ));

var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"]?
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Where(origin => Uri.TryCreate(origin, UriKind.Absolute, out _))
    .ToArray()
    ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.MapGet("/", context =>
{
    context.Response.Redirect(app.Environment.IsDevelopment() ? "/swagger" : "/health");
    return Task.CompletedTask;
});

app.UseCors("ReactPolicy");

app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    try
    {
        await db.Database.ExecuteSqlRawAsync("""
        IF OBJECT_ID('dbo.Compras', 'U') IS NOT NULL
           AND OBJECT_ID('dbo.SocioNegocio', 'U') IS NOT NULL
        BEGIN
            DECLARE @fkCompras NVARCHAR(128);

            SELECT TOP 1 @fkCompras = fk.name
            FROM sys.foreign_keys fk
            INNER JOIN sys.foreign_key_columns fkc
                ON fk.object_id = fkc.constraint_object_id
            WHERE fk.parent_object_id = OBJECT_ID('dbo.Compras')
              AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = 'ProveedorId'
              AND fk.referenced_object_id = OBJECT_ID('dbo.Proveedores');

            IF @fkCompras IS NOT NULL
            BEGIN
                EXEC('ALTER TABLE dbo.Compras DROP CONSTRAINT [' + @fkCompras + ']');
            END;

            IF NOT EXISTS
            (
                SELECT 1
                FROM sys.foreign_keys fk
                INNER JOIN sys.foreign_key_columns fkc
                    ON fk.object_id = fkc.constraint_object_id
                WHERE fk.parent_object_id = OBJECT_ID('dbo.Compras')
                  AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = 'ProveedorId'
                  AND fk.referenced_object_id = OBJECT_ID('dbo.SocioNegocio')
            )
            BEGIN
                ALTER TABLE dbo.Compras
                ADD CONSTRAINT FK_Compras_SocioNegocio_Proveedor
                FOREIGN KEY (ProveedorId) REFERENCES dbo.SocioNegocio(Id);
            END;
        END;

        IF OBJECT_ID('dbo.Ventas', 'U') IS NOT NULL
           AND OBJECT_ID('dbo.SocioNegocio', 'U') IS NOT NULL
        BEGIN
            DECLARE @fkVentas NVARCHAR(128);

            SELECT TOP 1 @fkVentas = fk.name
            FROM sys.foreign_keys fk
            INNER JOIN sys.foreign_key_columns fkc
                ON fk.object_id = fkc.constraint_object_id
            WHERE fk.parent_object_id = OBJECT_ID('dbo.Ventas')
              AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = 'ClienteId'
              AND fk.referenced_object_id = OBJECT_ID('dbo.Clientes');

            IF @fkVentas IS NOT NULL
            BEGIN
                EXEC('ALTER TABLE dbo.Ventas DROP CONSTRAINT [' + @fkVentas + ']');
            END;

            IF NOT EXISTS
            (
                SELECT 1
                FROM sys.foreign_keys fk
                INNER JOIN sys.foreign_key_columns fkc
                    ON fk.object_id = fkc.constraint_object_id
                WHERE fk.parent_object_id = OBJECT_ID('dbo.Ventas')
                  AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = 'ClienteId'
                  AND fk.referenced_object_id = OBJECT_ID('dbo.SocioNegocio')
            )
            BEGIN
                ALTER TABLE dbo.Ventas
                ADD CONSTRAINT FK_Ventas_SocioNegocio_Cliente
                FOREIGN KEY (ClienteId) REFERENCES dbo.SocioNegocio(Id);
            END;
        END;
        """);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "No se pudieron ajustar las llaves foraneas de SocioNegocio.");
    }
}

app.Run();
