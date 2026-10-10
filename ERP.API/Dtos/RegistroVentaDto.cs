namespace ERP.Application.DTOs.Reportes;

public record RegistroVentaDto(
    int VentaId,
    DateTime Fecha,
    string TipoDocumento,
    string Serie,
    string NumeroDocumento,
    string TipoDocumentoCliente,
    string NumeroDocumentoCliente,
    string Cliente,
    decimal BaseImponible,
    decimal IGV,
    decimal Total,
    string? Moneda,
    string? MetodoPago,
    string Estado,
    int? AsientoId
);