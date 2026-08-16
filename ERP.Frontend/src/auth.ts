import { apiUrl } from './config/api';

export type Sesion = {
  id: number;
  nombreCompleto: string;
  usuario: string;
  rol: 'ADMINISTRADOR' | 'VENDEDOR' | 'ALMACENERO';
  token: string;
};

const STORAGE_KEY = 'rebaysa.sesion';

export function obtenerSesion(): Sesion | null {
  try {
    const sesion = localStorage.getItem(STORAGE_KEY);
    return sesion ? JSON.parse(sesion) as Sesion : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion: Sesion) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
}

export function cerrarSesion() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function iniciarSesion(usuario: string, password: string): Promise<Sesion> {
  const response = await fetch(apiUrl('/Auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, password }),
  });
  const detalle = await response.text();
  if (!response.ok) throw new Error(detalle || 'No se pudo iniciar sesión.');
  return JSON.parse(detalle) as Sesion;
}

export function encabezadosAutorizados(headers: HeadersInit = {}) {
  const token = obtenerSesion()?.token;
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}
