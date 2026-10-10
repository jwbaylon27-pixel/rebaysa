import type { ModuleGroup } from '../modules';
import { apiUrl } from '../config/api';
import { encabezadosAutorizados, cerrarSesion } from '../auth';

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: encabezadosAutorizados() });

  if (response.status === 401) {
    cerrarSesion();
    // Evita bucle de reload: si varias peticiones fallan en paralelo,
    // solo la primera dispara el reload.
    if (!sessionStorage.getItem('sesionExpiradaReload')) {
      sessionStorage.setItem('sesionExpiradaReload', '1');
      window.location.reload();
    }
    throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Error HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export function listarModulos() {
  return request<ModuleGroup[]>(apiUrl('/modulos'));
}
