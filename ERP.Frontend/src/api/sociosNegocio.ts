import axios from "axios";
import { SocioNegocio, SocioNegocioForm } from "../types/socioNegocio";
import { apiUrl } from '../config/api';

const API_URL = apiUrl('/SocioNegocio');

// Listar
export const listarSociosNegocio = async (): Promise<SocioNegocio[]> => {
  const response = await axios.get<SocioNegocio[]>(API_URL);
  return response.data;
};

// Crear (usa SocioNegocioForm porque id es opcional)
export const crearSocioNegocio = async (socio: SocioNegocioForm): Promise<SocioNegocio> => {
  const response = await axios.post<SocioNegocio>(API_URL, socio);
  return response.data;
};

// Actualizar (usa id obligatorio)
//export const actualizarSocioNegocio = async (id: number, socio: SocioNegocioForm): Promise<SocioNegocio> => {
//  const response = await axios.put<SocioNegocio>(`${API_URL}/${id}`, socio);
//  return response.data;
//};
export const actualizarSocioNegocio = async (id:number,socio:SocioNegocioForm):Promise<void> => {
  await axios.put(`${API_URL}/${id}`,socio);
};
// Eliminar
export const eliminarSocioNegocio = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/${id}`);
};
