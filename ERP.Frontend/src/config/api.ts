// En desarrollo se usa el proxy de Vite. En Cloudflare Pages define
// VITE_API_URL con la URL HTTPS de Render, sin barra final.
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

export const apiUrl = (path: string) =>
  `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
