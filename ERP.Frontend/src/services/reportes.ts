import { apiUrl } from '../config/api';
import { encabezadosAutorizados, cerrarSesion } from '../auth';

export type RegistroVenta = {
  ventaId: number;
  fecha: string;
  tipoDocumento: string;
  serie: string;
  numeroDocumento: string;
  tipoDocumentoCliente: string;
  numeroDocumentoCliente: string;
  cliente: string;
  baseImponible: number;
  igv: number;
  total: number;
  moneda: string | null;
  metodoPago: string | null;
  estado: string;
  asientoId: number | null;
};

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: encabezadosAutorizados() });

  if (response.status === 401) {
    cerrarSesion();
    window.location.reload();
    throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Error HTTP ${response.status}`);
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function reporteRegistroVentas(fechaInicio?: string, fechaFin?: string) {
  const params = new URLSearchParams();
  if (fechaInicio) params.set('fechaInicio', fechaInicio);
  if (fechaFin) params.set('fechaFin', fechaFin);
  const query = params.toString();
  return request<RegistroVenta[]>(apiUrl(`/reportes/registro-ventas${query ? `?${query}` : ''}`));
}
