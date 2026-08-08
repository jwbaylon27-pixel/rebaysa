import type { ModuleGroup } from '../modules';
import { apiUrl } from '../config/api';

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Error HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export function listarModulos() {
  return request<ModuleGroup[]>(apiUrl('/modulos'));
}
