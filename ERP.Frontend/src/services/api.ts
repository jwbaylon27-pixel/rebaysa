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
// y fuerza volver a la pantalla de login (en vez de dejar la UI en un
// estado "logueado" que ya no puede pedir nada al backend).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      cerrarSesion();
      // Evita bucle de reload: si varias peticiones fallan en paralelo,
      // solo la primera dispara el reload.
      if (!sessionStorage.getItem('sesionExpiradaReload')) {
        sessionStorage.setItem('sesionExpiradaReload', '1');
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
