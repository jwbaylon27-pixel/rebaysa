import { FormEvent, useState } from 'react';
import { Save, Search } from 'lucide-react';
import api from '../../services/api';
import '../LiquidacionCosto/liquidacionCosto.css';

type TipoCambioDto = { fecha: string; tipoCambio: number };

function extraerMensajeError(err: unknown, fallback: string): string {
  const anyErr = err as { response?: { data?: { message?: string } } };
  return anyErr?.response?.data?.message ?? fallback;
}

export default function TipoCambioPage() {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [tipoCambio, setTipoCambio] = useState('');
  const [consultado, setConsultado] = useState<TipoCambioDto | null>(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function consultar() {
    try {
      setCargando(true);
      setError('');
      setMensaje('');
      const { data } = await api.get<TipoCambioDto>('/tipo-cambio', { params: { fecha } });
      setConsultado(data);
      setTipoCambio(String(data.tipoCambio));
    } catch (err) {
      setConsultado(null);
      setError(extraerMensajeError(err, 'No se pudo consultar el tipo de cambio.'));
    } finally {
      setCargando(false);
    }
  }

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setGuardando(true);
      setError('');
      setMensaje('');
      await api.post('/tipo-cambio', { fecha, tipoCambio: Number(tipoCambio) });
      setMensaje(`Tipo de cambio de ${fecha} guardado: ${tipoCambio}`);
      await consultar();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo guardar el tipo de cambio.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="lc-page">
      <div className="lc-page-header">
        <div>
          <p className="eyebrow">CONFIGURACIÓN</p>
          <h1>Tipo de cambio diario</h1>
        </div>
      </div>

      <p style={{ color: '#6b6a60', fontSize: '0.9rem', maxWidth: 560 }}>
        Este valor lo usan Compras, Ventas y Liquidación de Costo para convertir documentos en USD.
        Si no cargas el tipo de cambio de un día puntual (fin de semana, feriado), el sistema usa
        automáticamente el último que hayas registrado antes de esa fecha.
      </p>

      {error && <div className="alert compact-alert">{error}</div>}
      {mensaje && <div className="lc-panel" style={{ color: '#2c7a3d' }}>{mensaje}</div>}

      <form className="lc-form-costo" onSubmit={registrar} style={{ maxWidth: 520 }}>
        <label>
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </label>
        <label>
          Tipo de cambio (PEN por 1 USD)
          <input
            type="number" step="0.0001" min="0.0001"
            value={tipoCambio}
            onChange={(e) => setTipoCambio(e.target.value)}
            placeholder="3.7500"
            required
          />
        </label>
        <div className="lc-form-actions">
          <button type="button" className="secondary-button" onClick={consultar} disabled={cargando}>
            <Search size={16} /> {cargando ? 'Consultando…' : 'Consultar vigente'}
          </button>
          <button type="submit" className="primary-button" disabled={guardando}>
            <Save size={16} /> {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>

      {consultado && (
        <p style={{ fontSize: '0.85rem', color: '#6b6a60' }}>
          Tipo de cambio vigente para {consultado.fecha}: <strong>{consultado.tipoCambio}</strong>
        </p>
      )}
    </div>
  );
}
