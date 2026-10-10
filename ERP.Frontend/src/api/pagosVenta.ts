import { apiUrl } from '../config/api';
import { encabezadosAutorizados } from '../auth';

export type VentaPendiente = {
  ventaId: number;
  fecha: string;
  tipoDocumento: string;
  serie: string;
  numeroDocumento: string;
  clienteId: number;
  cliente: string;
  total: number;
  montoPagado: number;
  saldoPendiente: number;
  diasCredito: number | null;
  fechaVencimiento: string | null;
  diasVencido: number;
};

export type PagoVenta = {
  id: number;
  ventaId: number;
  fecha: string;
  monto: number;
  metodoPago: string;
  observacion: string | null;
  asientoId: number | null;
};

export type RegistrarPagoVenta = {
  monto: number;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA';
  fecha?: string;
  observacion?: string;
  usuarioId?: number;
};

const headers = {
  'Content-Type': 'application/json',
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: encabezadosAutorizados(options?.headers) });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Error HTTP ${response.status}`);
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function listarVentasPendientes() {
  return request<VentaPendiente[]>(apiUrl('/PagosVenta/pendientes'));
}

export function listarPagosDeVenta(ventaId: number) {
  return request<PagoVenta[]>(apiUrl(`/PagosVenta/venta/${ventaId}`));
}

export function registrarPagoVenta(ventaId: number, pago: RegistrarPagoVenta) {
  return request<{ mensaje: string; pagoId: number; asientoId: number; saldoPendiente: number; facturaPagada: boolean }>(
    apiUrl(`/PagosVenta/venta/${ventaId}`),
    {
      method: 'POST',
      headers,
      body: JSON.stringify(pago),
    }
  );
}
