import type { Categorias,Marca,Producto, ProductoForm } from '../types';
import { apiUrl } from '../config/api';

const headers = {
  'Content-Type': 'application/json',
};
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Error HTTP ${response.status}`);
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export function listarProductos() {
  return request<Producto[]>(apiUrl('/productos'));
}

export function crearProducto(producto: ProductoForm) {
  return request<number>(apiUrl('/productos'), {
    method: 'POST',
    headers,
    body: JSON.stringify(producto),
  });
}

export function actualizarProducto(producto: ProductoForm) {
  return request<void>(apiUrl('/productos'), {
    method: 'PUT',
    headers,
    body: JSON.stringify(producto),
  });
}

export function eliminarProducto(id: number) {
  return request<void>(apiUrl(`/productos/${id}`), {
    method: 'DELETE',
  });
}
export function listarMarcas() {
  return request<Marca[]>(apiUrl('/marcas'));
}
export function listarCategorias() {
  return request<Categorias[]>(apiUrl('/Categorias'));
}
