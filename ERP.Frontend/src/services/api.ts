import axios from "axios";
import { API_BASE_URL } from '../config/api';
import { obtenerSesion } from '../auth';
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }
});

api.interceptors.request.use((config) => {
    const token = obtenerSesion()?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export default api;
