/*namespace ERP.API.Dtos;

// ---------- Consultar disponible para acreditar ----------

public record ItemCreditoDisponibleDto(
    int ProductoId,
    string Producto,
    int CantidadOriginal,
    int CantidadAcreditada,
    int CantidadDisponible,
    decimal PrecioUnitario
);

public record VentaCreditoDisponibleDto(
    int VentaId,
    string TipoDocumento,
    string Serie,
    string NumeroDocumento,
    string Cliente,
    string MetodoPago,
    decimal TotalVenta,
    decimal TotalAcreditado,
    decimal TotalDisponible,
    bool PuedeAcreditar,
    List<ItemCreditoDisponibleDto> Items
);

// ---------- Registrar nota de credito ----------

public class ItemNotaCreditoDto
{
    public int ProductoId { get; set; }
    public int Cantidad { get; set; }
}

public class RegistrarNotaCreditoDto
{
    public int VentaId { get; set; }
    public string Serie { get; set; } = string.Empty;
    public string NumeroDocumento { get; set; } = string.Empty;
    public string? Motivo { get; set; }
    public string TipoAfectacion { get; set; } = "TOTAL"; // TOTAL | PARCIAL
    public bool DevolucionFisica { get; set; }
    public List<ItemNotaCreditoDto>? Detalles { get; set; } // requerido solo si PARCIAL
    public int? UsuarioId { get; set; }
}

// ---------- Listado ----------

public record NotaCreditoDto(
    int Id,
    int VentaId,
    DateTime Fecha,
    string Serie,
    string NumeroDocumento,
    string Motivo,
    string TipoAfectacion,
    bool DevolucionFisica,
    decimal SubTotal,
    decimal IGV,
    decimal Total,
    string Estado,
    int? AsientoId
);*/
namespace ERP.API.Dtos;

// ---------- Consultar disponible para acreditar ----------

public record ItemCreditoDisponibleDto(
    int ProductoId,
    string Producto,
    int CantidadOriginal,
    int CantidadAcreditada,
    int CantidadDisponible,
    decimal PrecioUnitario
);

public record VentaCreditoDisponibleDto(
    int VentaId,
    string TipoDocumento,
    string Serie,
    string NumeroDocumento,
    string Cliente,
    string MetodoPago,
    decimal TotalVenta,
    decimal TotalAcreditado,
    decimal TotalDisponible,
    bool PuedeAcreditar,
    List<ItemCreditoDisponibleDto> Items
);

// ---------- Registrar nota de credito ----------

public class ItemNotaCreditoDto
{
    public int ProductoId { get; set; }
    public int Cantidad { get; set; }
}

public class RegistrarNotaCreditoDto
{
    public int VentaId { get; set; }
    public DateTime? Fecha { get; set; }
    public string Serie { get; set; } = string.Empty;
    public string NumeroDocumento { get; set; } = string.Empty;
    public string? Motivo { get; set; }
    public string TipoAfectacion { get; set; } = "TOTAL"; // TOTAL | PARCIAL
    public bool DevolucionFisica { get; set; }
    public List<ItemNotaCreditoDto>? Detalles { get; set; } // requerido solo si PARCIAL
    public int? UsuarioId { get; set; }
}

// ---------- Listado ----------

public record NotaCreditoDto(
    int Id,
    int VentaId,
    DateTime Fecha,
    string Serie,
    string NumeroDocumento,
    string Motivo,
    string TipoAfectacion,
    bool DevolucionFisica,
    decimal SubTotal,
    decimal IGV,
    decimal Total,
    string Estado,
    int? AsientoId
);