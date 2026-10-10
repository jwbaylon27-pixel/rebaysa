import axios from "axios";
import { obtenerSesion, cerrarSesion } from "../auth";

// Este archivo se importa una sola vez (efecto secundario) desde App.tsx.
// Registra el interceptor sobre la instancia POR DEFECTO de axios — la misma
// que usan compras.ts y sociosNegocio.ts con "import axios from 'axios'".
// Sin esto, esos dos archivos nunca enviaban el header Authorization.

axios.interceptors.request.use((config) => {
  const token = obtenerSesion()?.token;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o vencido: limpiamos la sesión y forzamos volver al login.
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
