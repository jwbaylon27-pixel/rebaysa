namespace ERP.Domain.Entities
{
    /// <summary>Estados posibles de LiquidacionCosto.Estado (columna varchar(20)).</summary>
    public static class EstadosLiquidacion
    {
        public const string Borrador = "BORRADOR";
        public const string Calculado = "CALCULADO";
        public const string Confirmado = "CONFIRMADO";
        public const string Anulado = "ANULADO";
    }

    /// <summary>Codigos del catalogo LC_MetodoDistribucion.</summary>
    public static class MetodoDistribucionCodigos
    {
        public const string Valor = "VALOR";
        public const string Cantidad = "CANTIDAD";
        public const string Peso = "PESO";
        public const string Volumen = "VOLUMEN";
        public const string Manual = "MANUAL";
    }
}
