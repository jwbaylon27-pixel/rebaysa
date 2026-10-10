import axios from "axios";
import { apiUrl } from "../config/api";
import { obtenerSesion, cerrarSesion } from "../auth";

// baseURL resuelto igual que el resto de la app (apiUrl):
// relativo "/api" en local (via proxy de Vite), absoluto en producción.
const api = axios.create({
  baseURL: apiUrl("").replace(/\/$/, ""),
});

// Adjunta el Bearer token (de la sesion real guardada por auth.ts)
// a TODAS las peticiones hechas con esta instancia de axios.
api.interceptors.request.use((config) => {
  const token = obtenerSesion()?.token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el backend responde 401 (token vencido/invalido), limpia la sesion
// para que el usuario no quede atrapado viendo errores en cada pantalla.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      cerrarSesion();
    }
    return Promise.reject(error);
  }
);

export default api;