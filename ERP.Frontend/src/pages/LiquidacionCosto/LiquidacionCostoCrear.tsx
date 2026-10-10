import { FormEvent, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { crearLiquidacion, extraerMensajeError } from '../../api/liquidacionCosto';
import './liquidacionCosto.css';

type Props = {
  onCreada: (id: number) => void;
  onCancelar: () => void;
};

export default function LiquidacionCostoCrear({ onCreada, onCancelar }: Props) {
  const [numero, setNumero] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [almacenId, setAlmacenId] = useState('');
  const [monedaCodigo, setMonedaCodigo] = useState('PEN');
  const [tipoCambio, setTipoCambio] = useState('1');
  const [compraIdsTexto, setCompraIdsTexto] = useState('');
  const [observacion, setObservacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const compraIds = compraIdsTexto
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number);

    if (compraIds.some((id) => Number.isNaN(id))) {
      setError('Revisa los IDs de compra: deben ser números separados por comas.');
      return;
    }
    if (compraIds.length === 0) {
      setError('Debes indicar al menos una compra.');
      return;
    }

    try {
      setEnviando(true);
      setError('');
      const creada = await crearLiquidacion({
        numero,
        fecha,
        almacenId: almacenId ? Number(almacenId) : null,
        monedaCodigo,
        tipoCambio: tipoCambio ? Number(tipoCambio) : null,
        observacion: observacion || null,
        compraIds,
      });
      onCreada(creada.liquidacionCostoId);
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo crear la liquidación de costo.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="lc-page">
      <div className="lc-page-header">
        <div>
          <button className="secondary-button" onClick={onCancelar} type="button">
            <ArrowLeft size={16} /> Volver
          </button>
          <p className="eyebrow" style={{ marginTop: 12 }}>LIQUIDACIÓN DE COSTO</p>
          <h1>Nueva liquidación</h1>
        </div>
      </div>

      {error && <div className="alert compact-alert">{error}</div>}

      <form className="lc-form-costo" onSubmit={enviar} style={{ borderStyle: 'solid' }}>
        <label>
          Número *
          <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="LC-2026-000001" required />
        </label>
        <label>
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label>
          Almacén (Id)
          <input type="number" value={almacenId} onChange={(e) => setAlmacenId(e.target.value)} />
        </label>
        <label>
          Moneda
          <select value={monedaCodigo} onChange={(e) => setMonedaCodigo(e.target.value)}>
            <option value="PEN">PEN</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label>
          Tipo de cambio
          <input type="number" step="0.0001" value={tipoCambio} onChange={(e) => setTipoCambio(e.target.value)} />
        </label>

        <label className="lc-form-full">
          Compras a liquidar (IDs separados por coma) *
          <input
            value={compraIdsTexto}
            onChange={(e) => setCompraIdsTexto(e.target.value)}
            placeholder="101, 102, 105"
            required
          />
        </label>

        <label className="lc-form-full">
          Observación
          <input value={observacion} onChange={(e) => setObservacion(e.target.value)} />
        </label>

        <div className="lc-form-actions">
          <button className="secondary-button" type="button" onClick={onCancelar}>Cancelar</button>
          <button className="primary-button" type="submit" disabled={enviando}>
            <Save size={16} /> {enviando ? 'Creando…' : 'Crear liquidación'}
          </button>
        </div>
      </form>
    </div>
  );
}
