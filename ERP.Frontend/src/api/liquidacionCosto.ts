import api from '../services/api';
import type {
  MetodoDistribucionDto,
  TipoCostoDto,
  LiquidacionCostoDto,
  LiquidacionCostoDetalleDto,
  CrearLiquidacionDto,
  AgregarCostoDto,
  CalcularLiquidacionDto,
  ConfirmarLiquidacionDto,
  ResultadoCalculoDto,
  ResultadoConfirmacionDto,
} from '../types/liquidacionCosto';

// baseURL de `api` ya apunta a /api (ver services/api.ts), así que aquí
// las rutas van relativas a /api.
const BASE = '/liquidaciones-costo';

export interface FiltrosLiquidacion {
  estado?: string;
  almacenId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  numero?: string;
}

// ---------- Catálogos ----------

export async function obtenerMetodosDistribucion(): Promise<MetodoDistribucionDto[]> {
  const { data } = await api.get<MetodoDistribucionDto[]>(`${BASE}/catalogos/metodos-distribucion`);
  return data;
}

export async function obtenerTiposCosto(): Promise<TipoCostoDto[]> {
  const { data } = await api.get<TipoCostoDto[]>(`${BASE}/catalogos/tipos-costo`);
  return data;
}

// ---------- Consulta ----------

export async function listarLiquidaciones(filtros: FiltrosLiquidacion = {}): Promise<LiquidacionCostoDto[]> {
  const { data } = await api.get<LiquidacionCostoDto[]>(BASE, { params: filtros });
  return data;
}

export async function obtenerLiquidacion(id: number): Promise<LiquidacionCostoDto> {
  const { data } = await api.get<LiquidacionCostoDto>(`${BASE}/${id}`);
  return data;
}

// ---------- Creación / anulación ----------

export async function crearLiquidacion(dto: CrearLiquidacionDto): Promise<LiquidacionCostoDto> {
  const { data } = await api.post<LiquidacionCostoDto>(BASE, dto);
  return data;
}

export async function anularLiquidacion(id: number): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}

// ---------- Conceptos de costo ----------

export async function agregarCosto(liquidacionId: number, dto: AgregarCostoDto): Promise<LiquidacionCostoDetalleDto> {
  const { data } = await api.post<LiquidacionCostoDetalleDto>(`${BASE}/${liquidacionId}/costos`, dto);
  return data;
}

export async function actualizarCosto(
  liquidacionId: number,
  costoDetalleId: number,
  dto: AgregarCostoDto,
): Promise<LiquidacionCostoDetalleDto> {
  const { data } = await api.put<LiquidacionCostoDetalleDto>(`${BASE}/${liquidacionId}/costos/${costoDetalleId}`, dto);
  return data;
}

export async function eliminarCosto(liquidacionId: number, costoDetalleId: number): Promise<void> {
  await api.delete(`${BASE}/${liquidacionId}/costos/${costoDetalleId}`);
}

// ---------- Cálculo de distribución ----------

export async function calcularDistribucion(
  liquidacionId: number,
  dto: CalcularLiquidacionDto = {},
): Promise<ResultadoCalculoDto> {
  const { data } = await api.post<ResultadoCalculoDto>(`${BASE}/${liquidacionId}/calcular`, dto);
  return data;
}

export async function obtenerUltimoCalculo(liquidacionId: number): Promise<ResultadoCalculoDto | null> {
  try {
    const { data } = await api.get<ResultadoCalculoDto>(`${BASE}/${liquidacionId}/calculo`);
    return data;
  } catch (err) {
    if (esErrorHttp(err) && err.response?.status === 404) return null;
    throw err;
  }
}

// ---------- Confirmación ----------

export async function confirmarLiquidacion(
  liquidacionId: number,
  dto: ConfirmarLiquidacionDto = {},
): Promise<ResultadoConfirmacionDto> {
  const { data } = await api.post<ResultadoConfirmacionDto>(`${BASE}/${liquidacionId}/confirmar`, dto);
  return data;
}

// ---------- Utilidad de errores ----------

function esErrorHttp(err: unknown): err is { response?: { status: number; data?: { message?: string } } } {
  return typeof err === 'object' && err !== null && 'response' in err;
}

/** Extrae el mensaje de negocio que el backend envía como `{ message }` en 400/404/409. */
export function extraerMensajeError(err: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (esErrorHttp(err) && err.response?.data?.message) return err.response.data.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
