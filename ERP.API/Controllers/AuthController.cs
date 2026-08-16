using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ERP.API.Dtos;
using ERP.Persistence.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace ERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<SesionDto>> Login(LoginDto request)
    {
        var usuario = request.Usuario.Trim();
        if (string.IsNullOrWhiteSpace(usuario) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Ingresa tu usuario y contraseña.");

        var resultado = await _context.Database.SqlQueryRaw<UsuarioLoginDb>("""
            SELECT TOP 1
                u.Id,
                u.RolId,
                u.NombreCompleto,
                u.Usuario,
                u.PasswordHash,
                u.Activo,
                r.Nombre AS Rol
            FROM dbo.Usuarios u
            INNER JOIN dbo.Roles r ON r.Id = u.RolId
            WHERE u.Usuario = {0}
            """, usuario).SingleOrDefaultAsync();

        if (resultado is null || !resultado.Activo ||
            !string.Equals(resultado.PasswordHash, request.Password, StringComparison.Ordinal))
            return Unauthorized("Usuario o contraseña incorrectos.");

        var key = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("Falta configurar Jwt:Key.");
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, resultado.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, resultado.Id.ToString()),
            new Claim(ClaimTypes.Name, resultado.Usuario),
            new Claim(ClaimTypes.Role, resultado.Rol),
        };
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256));

        return Ok(new SesionDto(
            resultado.Id,
            resultado.NombreCompleto,
            resultado.Usuario,
            resultado.Rol,
            new JwtSecurityTokenHandler().WriteToken(token)));
    }

    private sealed class UsuarioLoginDb
    {
        public int Id { get; init; }
        public int RolId { get; init; }
        public string NombreCompleto { get; init; } = string.Empty;
        public string Usuario { get; init; } = string.Empty;
        public string PasswordHash { get; init; } = string.Empty;
        public bool Activo { get; init; }
        public string Rol { get; init; } = string.Empty;
    }
}
