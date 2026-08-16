namespace ERP.API.Dtos;

public sealed class LoginDto
{
    public string Usuario { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public sealed record SesionDto(int Id, string NombreCompleto, string Usuario, string Rol, string Token);
