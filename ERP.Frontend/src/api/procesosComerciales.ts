export type TipoProcesoComercial = 'compra' | 'venta';

export type MovimientoDetalle = {
  id: number;
  productoId: number;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
};

export type MovimientoComercial = {
  id: number;
  fecha: string;
  socioId: number;
  socio: string;
  detalles: MovimientoDetalle[];
  subTotal: number;
  igv: number;
  total: number;
  estado: string;
};

export type RegistrarMovimientoComercial = {
  socioId: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  usuarioId?: number;
  tipoDocumento?: string;
  serie?: string;
  numeroDocumento?: string;
  metodoPago?: string;
  observacion?: string;
};

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

function endpoint(tipo: TipoProcesoComercial) {
  return apiUrl(tipo === 'compra' ? '/Compras' : '/Ventas');
}

export function listarMovimientosComerciales(tipo: TipoProcesoComercial) {
  return request<MovimientoComercial[]>(endpoint(tipo));
}

export function registrarMovimientoComercial(tipo: TipoProcesoComercial, movimiento: RegistrarMovimientoComercial) {
  return request<number>(endpoint(tipo), {
    method: 'POST',
    headers,
    body: JSON.stringify(movimiento),
  });
}
import { apiUrl } from '../config/api';
