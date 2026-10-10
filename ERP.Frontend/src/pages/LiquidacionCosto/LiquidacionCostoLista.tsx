import { useEffect, useState } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { listarLiquidaciones, extraerMensajeError, type FiltrosLiquidacion } from '../../api/liquidacionCosto';
import type { LiquidacionCostoDto, EstadoLiquidacion } from '../../types/liquidacionCosto';
import './liquidacionCosto.css';

type Props = {
  onCrear: () => void;
  onVerDetalle: (id: number) => void;
};

const ETIQUETA_ESTADO: Record<EstadoLiquidacion, string> = {
  BORRADOR: 'Borrador',
  CALCULADO: 'Calculado',
  CONFIRMADO: 'Confirmado',
  ANULADO: 'Anulado',
};

function BadgeEstado({ estado }: { estado: EstadoLiquidacion }) {
  return <span className={`lc-badge lc-badge-${estado.toLowerCase()}`}>{ETIQUETA_ESTADO[estado]}</span>;
}

function formatearMoneda(valor: number, monedaCodigo: string) {
  return `${monedaCodigo} ${valor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE');
}

export default function LiquidacionCostoLista({ onCrear, onVerDetalle }: Props) {
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionCostoDto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState<FiltrosLiquidacion>({});

  async function cargar(filtrosActuales: FiltrosLiquidacion) {
    try {
      setCargando(true);
      setError('');
      const data = await listarLiquidaciones(filtrosActuales);
      setLiquidaciones(data);
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudieron cargar las liquidaciones de costo.'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar(filtros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buscar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    cargar(filtros);
  }

  return (
    <div className="lc-page">
      <div className="lc-page-header">
        <div>
          <p className="eyebrow">LIQUIDACIÓN DE COSTO</p>
          <h1>Liquidaciones de costo</h1>
        </div>
        <div className="lc-actions">
          <button className="secondary-button" onClick={() => cargar(filtros)} disabled={cargando}>
            <RefreshCw size={16} /> Actualizar
          </button>
          <button className="primary-button" onClick={onCrear}>
            <Plus size={16} /> Nueva liquidación
          </button>
        </div>
      </div>

      <form className="lc-filtros" onSubmit={buscar}>
        <label>
          Número
          <input
            value={filtros.numero ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, numero: e.target.value || undefined }))}
            placeholder="LC-2026-..."
          />
        </label>
        <label>
          Estado
          <select
            value={filtros.estado ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, estado: e.target.value || undefined }))}
          >
            <option value="">Todos</option>
            <option value="BORRADOR">Borrador</option>
            <option value="CALCULADO">Calculado</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="ANULADO">Anulado</option>
          </select>
        </label>
        <label>
          Almacén
          <input
            type="number"
            value={filtros.almacenId ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, almacenId: e.target.value ? Number(e.target.value) : undefined }))}
          />
        </label>
        <label>
          Desde
          <input
            type="date"
            value={filtros.fechaDesde ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, fechaDesde: e.target.value || undefined }))}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={filtros.fechaHasta ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, fechaHasta: e.target.value || undefined }))}
          />
        </label>
        <button className="secondary-button" type="submit">
          <Search size={16} /> Buscar
        </button>
      </form>

      {error && <div className="alert compact-alert">{error}</div>}

      <div className="lc-table-wrap">
        <table className="lc-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Mercadería</th>
              <th>Costos</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={7} className="lc-empty">Cargando…</td>
              </tr>
            ) : liquidaciones.length === 0 ? (
              <tr>
                <td colSpan={7} className="lc-empty">No hay liquidaciones registradas con estos filtros.</td>
              </tr>
            ) : (
              liquidaciones.map((l) => (
                <tr key={l.liquidacionCostoId} onClick={() => onVerDetalle(l.liquidacionCostoId)} style={{ cursor: 'pointer' }}>
                  <td>{l.numero}</td>
                  <td>{formatearFecha(l.fecha)}</td>
                  <td><BadgeEstado estado={l.estado} /></td>
                  <td className="numero">{formatearMoneda(l.totalMercaderia, l.monedaCodigo)}</td>
                  <td className="numero">{formatearMoneda(l.totalCostos, l.monedaCodigo)}</td>
                  <td className="numero">{formatearMoneda(l.totalLiquidacion, l.monedaCodigo)}</td>
                  <td>
                    <button className="secondary-button" onClick={(e) => { e.stopPropagation(); onVerDetalle(l.liquidacionCostoId); }}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
