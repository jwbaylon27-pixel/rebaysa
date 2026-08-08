/*import type { Compra, CompraForm } from '../types';
const API = '/api/compras';
export async function listarCompras(): Promise<Compra[]> {
  const response = await fetch(API);
  if (!response.ok) {
    throw new Error('No se pudieron cargar las compras');
  }
  return response.json();
}
export async function crearCompra(data: CompraForm) {
  const response = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
}*/
import axios from "axios";
import { Compra } from "../types/compra";
import { apiUrl } from '../config/api';

const API_URL = apiUrl('/compras');

export const guardarCompra = async (compra: Compra) => {
  const response = await axios.post(API_URL, compra);
  return response.data;
};

export const listarCompras = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};
