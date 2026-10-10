using System.Net.Http.Headers;
using System.Text.Json;
using ERP.Application.Interfaces;
using ERP.Domain.Dtos.Sunat;
using Microsoft.Extensions.Configuration;

namespace ERP.Persistence.Services;

public class SunatService : ISunatService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public SunatService(
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<RucConsultaDto> ConsultarRucAsync(
        string ruc,
        CancellationToken cancellationToken = default)
    {
        ruc = (ruc ?? string.Empty).Trim();

        if (ruc.Length != 11 || !ruc.All(char.IsDigit))
        {
            throw new ArgumentException(
                "El RUC debe contener exactamente 11 dígitos.");
        }

        var token = _configuration["SunatApi:Token"];

        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException(
                "No está configurado el token de consulta RUC.");
        }

        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"v1/sunat/ruc?numero={ruc}");

        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        request.Headers.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await _httpClient.SendAsync(
            request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"El servicio de consulta RUC respondió HTTP " +
                $"{(int)response.StatusCode}.");
        }

        await using var stream =
            await response.Content.ReadAsStreamAsync(cancellationToken);

        using var json = await JsonDocument.ParseAsync(
            stream, cancellationToken: cancellationToken);

        var root = json.RootElement;

        string Leer(params string[] nombres)
        {
            foreach (var nombre in nombres)
            {
                if (root.ValueKind == JsonValueKind.Object &&
                    root.TryGetProperty(nombre, out var valor) &&
                    valor.ValueKind != JsonValueKind.Null &&
                    valor.ValueKind != JsonValueKind.Undefined)
                {
                    return valor.ValueKind == JsonValueKind.String
                        ? valor.GetString() ?? string.Empty
                        : valor.ToString();
                }
            }

            return string.Empty;
        }

        var resultado = new RucConsultaDto
        {
            Ruc = Leer("numero_documento", "ruc", "numero"),
            RazonSocial = Leer(
                "razon_social", "razonSocial", "nombre_o_razon_social"),
            NombreComercial = Leer(
                "nombre_comercial", "nombreComercial"),
            Direccion = Leer(
                "direccion", "direccion_completa", "domicilio_fiscal"),
            Departamento = Leer("departamento"),
            Provincia = Leer("provincia"),
            Distrito = Leer("distrito"),
            Estado = Leer("estado"),
            Condicion = Leer("condicion", "condicion_domicilio")
        };

        // No todos los proveedores utilizan exactamente
        // los mismos nombres de propiedades.
        if (string.IsNullOrWhiteSpace(resultado.Ruc))
            resultado.Ruc = ruc;

        if (string.IsNullOrWhiteSpace(resultado.RazonSocial))
        {
            throw new InvalidOperationException(
                "La respuesta no contiene una razón social reconocible. " +
                "Verifica el formato de respuesta del proveedor.");
        }

        return resultado;
    }
}