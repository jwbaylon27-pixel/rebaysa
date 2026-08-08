using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Application.DTOs.Kardex;
public class KardexFiltroDto
{
    public int ProductoId { get; set; }
    public int AlmacenId { get; set; }
    public string? TipoMovimiento { get; set; }
    public DateTime? FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }
}
