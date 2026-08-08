namespace ERP.Application.DTOs;

public class TipoMovimientoDTO
{
    public int Id { get; set; }

    public string Codigo { get; set; } = string.Empty;

    public string Nombre { get; set; } = string.Empty;

    public string Tipo { get; set; } = string.Empty;

    public bool Activo { get; set; }
}