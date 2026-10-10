// Refleja 1:1 los DTOs de ERP.API.Dtos.LandedCost.
// Nota: los Id `long` de C# se tipan como `number`; si algún día tus
// identificadores superan 2^53 (poco probable en IDs de fila), habría que
// pasar a string + bigint en el backend/frontend.

export type EstadoLiquidacion = 'BORRADOR' | 'CALCULADO' | 'CONFIRMADO' | 'ANULADO';

// ---------- Catálogos ----------

export interface MetodoDistribucionDto {
  metodoDistribucionId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface TipoCostoDto {
  tipoCostoId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  metodoDistribucionId: number;
  metodoDistribucionCodigo: string;
  metodoDistribucionNombre: string;
}

// ---------- Crear liquidación ----------

export interface CrearLiquidacionDto {
  numero: string;
  fecha?: string | null;
  almacenId?: number | null;
  monedaCodigo?: string | null;
  tipoCambio?: number | null;
  observacion?: string | null;
  compraIds: number[];
  usuarioId?: number | null;
}

// ---------- Agregar concepto de costo ----------

export interface AgregarCostoDto {
  tipoCostoId: number;
  proveedorId?: number | null;
  tipoDocumento?: string | null;
  serie?: string | null;
  numeroDocumento?: string | null;
  fechaDocumento?: string | null;
  importe: number;
  monedaCodigo?: string | null;
  tipoCambio?: number | null;
  metodoDistribucionId?: number | null;
  cuentaContableId?: number | null;
  observacion?: string | null;
}

// ---------- Calcular distribución ----------

export interface PorcentajeManualDto {
  compraDetalleId: number;
  porcentaje: number;
}

export interface PorcentajesManualesPorCostoDto {
  liquidacionCostoDetalleId: number;
  porcentajes: PorcentajeManualDto[];
}

export interface CalcularLiquidacionDto {
  porcentajesManuales?: PorcentajesManualesPorCostoDto[] | null;
}

// ---------- Confirmar ----------

export interface ConfirmarLiquidacionDto {
  usuarioId?: number | null;
  cuentaMercaderiaId?: number | null;
}

// ---------- Resultados ----------

export interface LiquidacionCompraDto {
  liquidacionCompraId: number;
  compraId: number;
  proveedor: string;
  documento: string;
  totalCompra: number;
}

export interface LiquidacionCostoDetalleDto {
  liquidacionCostoDetalleId: number;
  tipoCostoId: number;
  tipoCosto: string;
  proveedorId: number | null;
  proveedor: string | null;
  tipoDocumento: string | null;
  serie: string | null;
  numeroDocumento: string | null;
  importe: number;
  monedaCodigo: string;
  tipoCambio: number;
  importeBase: number;
  metodoDistribucionId: number;
  metodoDistribucion: string;
  cuentaContableId: number | null;
}

export interface LiquidacionCostoDto {
  liquidacionCostoId: number;
  numero: string;
  fecha: string;
  almacenId: number | null;
  monedaCodigo: string;
  tipoCambio: number;
  estado: EstadoLiquidacion;
  totalMercaderia: number;
  totalCostos: number;
  totalLiquidacion: number;
  asientoContableId: number | null;
  observacion: string | null;
  compras: LiquidacionCompraDto[];
  costos: LiquidacionCostoDetalleDto[];
}

export interface ItemCalculadoDto {
  productoId: number;
  producto: string;
  cantidad: number;
  costoCompraUnitario: number;
  costoUnitarioAdicional: number;
  costoUnitarioFinal: number;
  valorCompra: number;
  costoTotalAsignado: number;
}

export interface ResultadoCalculoDto {
  liquidacionCostoId: number;
  totalMercaderia: number;
  totalCostos: number;
  totalLiquidacion: number;
  items: ItemCalculadoDto[];
}

export interface ResultadoConfirmacionDto {
  liquidacionCostoId: number;
  asientoId: number;
  numeroAsiento: string;
  totalDebe: number;
  totalHaber: number;
  productosRevalorizados: number;
}
