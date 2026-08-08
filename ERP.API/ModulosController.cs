using Microsoft.AspNetCore.Mvc;

namespace ERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ModulosController : ControllerBase
{
    [HttpGet]
    public IActionResult Listar()
    {
        var modulos = new[]
        {
            new ModuleGroupDto("Backend", new[]
            {
                new ModuleDto("Auth", "Autenticacion, tokens y recuperacion de cuenta.", "planeado"),
                new ModuleDto("Usuarios", "Administracion de usuarios del sistema.", "planeado"),
                new ModuleDto("Roles", "Perfiles, permisos y acceso por modulo.", "planeado"),
                new ModuleDto("Productos", "Catalogo de repuestos, marcas y categorias.", "activo"),
                new ModuleDto("Inventario", "Stock, ajustes y movimientos internos.", "planeado"),
                new ModuleDto("Compras", "Compras, proveedores y cuentas por pagar.", "activo"),
                new ModuleDto("Ventas", "Ventas, comprobantes y cuentas por cobrar.", "activo"),
                new ModuleDto("Kardex", "Historial valorizado de entradas y salidas.", "planeado"),
                new ModuleDto("SocioNegocio", "Clientes y proveedores centralizados por TipoSocio.", "activo"),
                new ModuleDto("Vehiculos", "Vehiculos asociados a clientes.", "planeado"),
                new ModuleDto("Dashboard", "Indicadores y resumen operativo.", "activo"),
                new ModuleDto("Alertas", "Stock minimo, pendientes y vencimientos.", "planeado"),
                new ModuleDto("Reportes", "Reportes de ventas, compras e inventario.", "planeado"),
            }),
            new ModuleGroupDto("Frontend", new[]
            {
                new ModuleDto("Login", "Ingreso seguro al sistema.", "planeado"),
                new ModuleDto("Dashboard", "Vista inicial con metricas clave.", "activo"),
                new ModuleDto("Productos", "Mantenimiento de productos.", "activo"),
                new ModuleDto("Compras", "Registro y consulta de compras.", "activo"),
                new ModuleDto("Ventas", "Registro y consulta de ventas.", "activo"),
                new ModuleDto("Inventario", "Stock actual y ajustes.", "planeado"),
                new ModuleDto("Kardex", "Movimientos por producto.", "planeado"),
                new ModuleDto("Clientes", "Socios tipo C para ventas y cuentas por cobrar.", "activo"),
                new ModuleDto("Proveedores", "Socios tipo P para compras y cuentas por pagar.", "activo"),
                new ModuleDto("Reportes", "Reportes operativos.", "planeado"),
                new ModuleDto("Configuracion", "Empresa, usuarios, roles y parametros.", "planeado"),
            }),
        };

        return Ok(modulos);
    }
}

public record ModuleGroupDto(string Group, IEnumerable<ModuleDto> Modules);

public record ModuleDto(string Name, string Description, string Status);
