import type { ModuleGroup } from '../modules';
import { apiUrl } from '../config/api';
import { encabezadosAutorizados } from '../auth';

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: encabezadosAutorizados() });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Error HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export function listarModulos() {
  return request<ModuleGroup[]>(apiUrl('/modulos'));
}
