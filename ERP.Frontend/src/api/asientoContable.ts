import { apiUrl } from '../config/api';
import { encabezadosAutorizados, cerrarSesion } from '../auth';

export type AsientoContableLinea = {
  cuentaId: number;
  cuentaCodigo: string;
  cuentaNombre: string;
  debe: number;
  haber: number;
  glosa: string | null;
};

export type AsientoContable = {
  id: number;
  fecha: string;
  tipoOperacion: string;
  referenciaId: number;
  glosa: string | null;
  totalDebe: number;
  totalHaber: number;
  detalles: AsientoContableLinea[];
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

  return (await response.json()) as T;
}

export function obtenerAsientoContable(id: number) {
  return request<AsientoContable>(apiUrl(`/AsientoContable/${id}`));
}
