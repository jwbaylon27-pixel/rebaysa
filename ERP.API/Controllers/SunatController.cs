using ERP.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ERP.API.Controllers;

[ApiController]
[Route("api/sunat")]
public class SunatController : ControllerBase
{
    private readonly ISunatService _sunatService;
    private readonly ILogger<SunatController> _logger;

    public SunatController(
        ISunatService sunatService,
        ILogger<SunatController> logger)
    {
        _sunatService = sunatService;
        _logger = logger;
    }

    [HttpGet("ruc/{ruc}")]
    public async Task<IActionResult> ConsultarRuc(
        string ruc,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(ruc) ||
            ruc.Length != 11 ||
            !ruc.All(char.IsDigit))
        {
            return BadRequest(
                new { mensaje = "Ingresa un RUC válido de 11 dígitos." });
        }

        try
        {
            var resultado = await _sunatService.ConsultarRucAsync(
                ruc, cancellationToken);

            return Ok(resultado);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { mensaje = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Error consultando RUC {Ruc}", ruc);

            return StatusCode(502, new
            {
                mensaje = "No fue posible consultar el servicio externo. Intenta nuevamente."
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Error de configuración de consulta RUC");

            return StatusCode(500, new
            {
                mensaje = "Revisa la configuración del servicio de consulta RUC."
            });
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(504, new
            {
                mensaje = "La consulta RUC excedió el tiempo de espera."
            });
        }
    }
}