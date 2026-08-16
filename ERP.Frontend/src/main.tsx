import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Registra el interceptor que adjunta el token JWT a todas las llamadas Axios.
import './services/api';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
