import { apiUrl } from '../config/api';
import { encabezadosAutorizados, cerrarSesion } from '../auth';

export type ItemCreditoDisponible = {
  productoId: number;
  producto: string;
  cantidadOriginal: number;
  cantidadAcreditada: number;
  cantidadDisponible: number;
  precioUnitario: number;
};

export type VentaCreditoDisponible = {
  ventaId: number;
  tipoDocumento: string;
  serie: string;
  numeroDocumento: string;
  cliente: string;
  metodoPago: string;
  totalVenta: number;
  totalAcreditado: number;
  totalDisponible: number;
  puedeAcreditar: boolean;
  items: ItemCreditoDisponible[];
};

export type ItemNotaCredito = {
  productoId: number;
  cantidad: number;
};

export type RegistrarNotaCredito = {
  ventaId: number;
  fecha?: string;
  serie: string;
  numeroDocumento: string;
  motivo?: string;
  tipoAfectacion: 'TOTAL' | 'PARCIAL';
  devolucionFisica: boolean;
  detalles?: ItemNotaCredito[]; // requerido solo si PARCIAL
  usuarioId?: number;
};

export type RegistrarNotaCreditoRespuesta = {
  mensaje: string;
  notaCreditoId: number;
  asientoId: number;
  total: number;
  ventaAnulada: boolean;
};

const headers = {
  'Content-Type': 'application/json',
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: encabezadosAutorizados(options?.headers) });

  if (response.status === 401) {
    cerrarSesion();
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

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function consultarDisponible(ventaId: number) {
  return request<VentaCreditoDisponible>(apiUrl(`/NotasCredito/venta/${ventaId}/disponible`));
}

export function registrarNotaCredito(dto: RegistrarNotaCredito) {
  return request<RegistrarNotaCreditoRespuesta>(apiUrl('/NotasCredito'), {
    method: 'POST',
    headers,
    body: JSON.stringify(dto),
  });
}