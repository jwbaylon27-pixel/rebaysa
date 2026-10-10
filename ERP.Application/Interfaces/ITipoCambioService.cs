using System;
using System.Threading.Tasks;

namespace ERP.Application.Interfaces
{
    /// <summary>
    /// Fuente única del tipo de cambio diario del sistema (PEN/USD). Cualquier módulo
    /// que registre un documento en USD (Compras, Ventas, etc.) debe resolver el T.C.
    /// de la fecha del documento aquí, en vez de aceptarlo como texto libre del usuario.
    /// </summary>
    public interface ITipoCambioService
    {
        /// <summary>
        /// T.C. vigente para <paramref name="fecha"/>. Si no hay uno cargado exactamente
        /// para ese día (fin de semana, feriado), devuelve el último registrado antes de esa fecha.
        /// Lanza InvalidOperationException si no existe ningún registro previo.
        /// </summary>
        Task<decimal> ObtenerAsync(DateTime fecha);

        /// <summary>Alta o actualización del T.C. de un día puntual (upsert).</summary>
        Task RegistrarAsync(DateTime fecha, decimal tipoCambio, int usuarioId);
    }
}
