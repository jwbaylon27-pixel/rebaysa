// ====================================================================
// DTOs — ERP.API/Dtos/AsientoContableDto.cs
// ====================================================================
namespace ERP.API.Dtos;

public record AsientoContableLineaDto(
    int CuentaId,
    string CuentaCodigo,
    string CuentaNombre,
    decimal Debe,
    decimal Haber,
    string? Glosa
);

public record AsientoContableDto(
    int Id,
    DateTime Fecha,
    string TipoOperacion,
    int ReferenciaId,
    string? Glosa,
    decimal TotalDebe,
    decimal TotalHaber,
    List<AsientoContableLineaDto> Detalles
);