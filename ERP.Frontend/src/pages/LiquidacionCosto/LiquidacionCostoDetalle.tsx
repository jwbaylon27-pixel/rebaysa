import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Calculator, CheckCircle2, Ban, AlertTriangle } from 'lucide-react';
import {
  obtenerLiquidacion,
  obtenerTiposCosto,
  obtenerMetodosDistribucion,
  agregarCosto,
  eliminarCosto,
  calcularDistribucion,
  obtenerUltimoCalculo,
  confirmarLiquidacion,
  anularLiquidacion,
  extraerMensajeError,
} from '../../api/liquidacionCosto';
import type {
  LiquidacionCostoDto,
  TipoCostoDto,
  MetodoDistribucionDto,
  AgregarCostoDto,
  ResultadoCalculoDto,
  ResultadoConfirmacionDto,
  EstadoLiquidacion,
} from '../../types/liquidacionCosto';
import './liquidacionCosto.css';

type Props = {
  id: number;
  onVolver: () => void;
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

function moneda(valor: number, codigo: string) {
  return `${codigo} ${valor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const FORM_COSTO_VACIO: AgregarCostoDto = {
  tipoCostoId: 0,
  importe: 0,
  proveedorId: null,
  tipoDocumento: '',
  serie: '',
  numeroDocumento: '',
  fechaDocumento: null,
  monedaCodigo: null,
  tipoCambio: null,
  metodoDistribucionId: null,
  cuentaContableId: null,
  observacion: '',
};

export default function LiquidacionCostoDetalle({ id, onVolver }: Props) {
  const [liquidacion, setLiquidacion] = useState<LiquidacionCostoDto | null>(null);
  const [tiposCosto, setTiposCosto] = useState<TipoCostoDto[]>([]);
  const [metodos, setMetodos] = useState<MetodoDistribucionDto[]>([]);
  const [calculo, setCalculo] = useState<ResultadoCalculoDto | null>(null);
  const [confirmacion, setConfirmacion] = useState<ResultadoConfirmacionDto | null>(null);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [mostrarFormCosto, setMostrarFormCosto] = useState(false);
  const [formCosto, setFormCosto] = useState<AgregarCostoDto>(FORM_COSTO_VACIO);
  const [guardandoCosto, setGuardandoCosto] = useState(false);

  const [calculando, setCalculando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [cuentaMercaderiaId, setCuentaMercaderiaId] = useState('');

  async function cargarTodo() {
    try {
      setCargando(true);
      setError('');
      const [liq, tc, md] = await Promise.all([
        obtenerLiquidacion(id),
        obtenerTiposCosto(),
        obtenerMetodosDistribucion(),
      ]);
      setLiquidacion(liq);
      setTiposCosto(tc);
      setMetodos(md);

      if (liq.estado === 'CALCULADO' || liq.estado === 'CONFIRMADO') {
        const ultimo = await obtenerUltimoCalculo(id);
        setCalculo(ultimo);
      } else {
        setCalculo(null);
      }
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo cargar la liquidación de costo.'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (cargando) {
    return <div className="lc-page"><p>Cargando…</p></div>;
  }

  if (!liquidacion) {
    return (
      <div className="lc-page">
        <button className="secondary-button" onClick={onVolver}><ArrowLeft size={16} /> Volver</button>
        <div className="alert compact-alert">{error || 'No se encontró la liquidación.'}</div>
      </div>
    );
  }

  const editable = liquidacion.estado === 'BORRADOR' || liquidacion.estado === 'CALCULADO';
  const hayCostoManual = liquidacion.costos.some((c) => c.metodoDistribucion.toUpperCase() === 'MANUAL');

  async function onAgregarCosto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formCosto.tipoCostoId) {
      setError('Selecciona un tipo de costo.');
      return;
    }
    try {
      setGuardandoCosto(true);
      setError('');
      await agregarCosto(id, formCosto);
      setFormCosto(FORM_COSTO_VACIO);
      setMostrarFormCosto(false);
      await cargarTodo();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo agregar el concepto de costo.'));
    } finally {
      setGuardandoCosto(false);
    }
  }

  async function onEliminarCosto(costoDetalleId: number) {
    if (!confirm('¿Eliminar este concepto de costo?')) return;
    try {
      setError('');
      await eliminarCosto(id, costoDetalleId);
      await cargarTodo();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo eliminar el concepto de costo.'));
    }
  }

  async function onCalcular() {
    try {
      setCalculando(true);
      setError('');
      const resultado = await calcularDistribucion(id, {});
      setCalculo(resultado);
      await cargarTodo();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo calcular la distribución de costos.'));
    } finally {
      setCalculando(false);
    }
  }

  async function onConfirmar() {
    if (!confirm('Confirmar generará el asiento contable y revalorizará el inventario. ¿Continuar?')) return;
    try {
      setConfirmando(true);
      setError('');
      const resultado = await confirmarLiquidacion(id, {
        cuentaMercaderiaId: cuentaMercaderiaId ? Number(cuentaMercaderiaId) : null,
      });
      setConfirmacion(resultado);
      await cargarTodo();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo confirmar la liquidación de costo.'));
    } finally {
      setConfirmando(false);
    }
  }

  async function onAnular() {
    if (!confirm('¿Anular esta liquidación de costo? Esta acción no se puede deshacer.')) return;
    try {
      setError('');
      await anularLiquidacion(id);
      onVolver();
    } catch (err) {
      setError(extraerMensajeError(err, 'No se pudo anular la liquidación de costo.'));
    }
  }

  return (
    <div className="lc-page">
      <div className="lc-page-header">
        <div>
          <button className="secondary-button" onClick={onVolver}><ArrowLeft size={16} /> Volver</button>
          <p className="eyebrow" style={{ marginTop: 12 }}>LIQUIDACIÓN DE COSTO</p>
          <h1>{liquidacion.numero} <BadgeEstado estado={liquidacion.estado} /></h1>
        </div>
        <div className="lc-actions">
          {editable && (
            <button className="danger-button" onClick={onAnular}>
              <Ban size={16} /> Anular
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert compact-alert">{error}</div>}

      <div className="lc-cards">
        <div className="lc-card"><span>Fecha</span><strong>{new Date(liquidacion.fecha).toLocaleDateString('es-PE')}</strong></div>
        <div className="lc-card"><span>Almacén</span><strong>{liquidacion.almacenId ?? '—'}</strong></div>
        <div className="lc-card"><span>Moneda / T.C.</span><strong>{liquidacion.monedaCodigo} · {liquidacion.tipoCambio}</strong></div>
        <div className="lc-card"><span>Mercadería</span><strong>{moneda(liquidacion.totalMercaderia, liquidacion.monedaCodigo)}</strong></div>
        <div className="lc-card"><span>Costos</span><strong>{moneda(liquidacion.totalCostos, liquidacion.monedaCodigo)}</strong></div>
        <div className="lc-card"><span>Total liquidación</span><strong>{moneda(liquidacion.totalLiquidacion, liquidacion.monedaCodigo)}</strong></div>
      </div>

      {/* ---------- Compras asociadas ---------- */}
      <div className="lc-section">
        <h2>Compras asociadas</h2>
        <div className="lc-table-wrap">
          <table className="lc-table">
            <thead>
              <tr><th>Compra Id</th><th>Proveedor</th><th>Documento</th><th>Total</th></tr>
            </thead>
            <tbody>
              {liquidacion.compras.length === 0 ? (
                <tr><td colSpan={4} className="lc-empty">Sin compras asociadas.</td></tr>
              ) : (
                liquidacion.compras.map((c) => (
                  <tr key={c.liquidacionCompraId}>
                    <td>{c.compraId}</td>
                    <td>{c.proveedor}</td>
                    <td>{c.documento}</td>
                    <td className="numero">{moneda(c.totalCompra, liquidacion.monedaCodigo)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Conceptos de costo ---------- */}
      <div className="lc-section">
        <h2>Conceptos de costo</h2>
        <div className="lc-table-wrap">
          <table className="lc-table">
            <thead>
              <tr>
                <th>Tipo</th><th>Proveedor</th><th>Documento</th><th>Importe</th>
                <th>T.C.</th><th>Importe base</th><th>Método</th>
                {editable && <th></th>}
              </tr>
            </thead>
            <tbody>
              {liquidacion.costos.length === 0 ? (
                <tr><td colSpan={editable ? 8 : 7} className="lc-empty">Aún no hay conceptos de costo.</td></tr>
              ) : (
                liquidacion.costos.map((c) => (
                  <tr key={c.liquidacionCostoDetalleId}>
                    <td>{c.tipoCosto}</td>
                    <td>{c.proveedor ?? '—'}</td>
                    <td>{[c.tipoDocumento, c.serie, c.numeroDocumento].filter(Boolean).join(' ') || '—'}</td>
                    <td className="numero">{c.monedaCodigo} {c.importe.toFixed(2)}</td>
                    <td className="numero">{c.tipoCambio}</td>
                    <td className="numero">{moneda(c.importeBase, liquidacion.monedaCodigo)}</td>
                    <td>{c.metodoDistribucion}</td>
                    {editable && (
                      <td>
                        <button className="danger-button" onClick={() => onEliminarCosto(c.liquidacionCostoDetalleId)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {editable && !mostrarFormCosto && (
          <button className="secondary-button" style={{ marginTop: 12 }} onClick={() => setMostrarFormCosto(true)}>
            <Plus size={16} /> Agregar concepto de costo
          </button>
        )}

        {editable && mostrarFormCosto && (
          <form className="lc-form-costo" onSubmit={onAgregarCosto}>
            <label>
              Tipo de costo *
              <select
                value={formCosto.tipoCostoId || ''}
                onChange={(e) => setFormCosto((f) => ({ ...f, tipoCostoId: Number(e.target.value) }))}
                required
              >
                <option value="">Selecciona…</option>
                {tiposCosto.map((t) => (
                  <option key={t.tipoCostoId} value={t.tipoCostoId}>{t.nombre} ({t.metodoDistribucionCodigo})</option>
                ))}
              </select>
            </label>
            <label>
              Importe *
              <input
                type="number" step="0.01" value={formCosto.importe || ''}
                onChange={(e) => setFormCosto((f) => ({ ...f, importe: Number(e.target.value) }))}
                required
              />
            </label>
            <label>
              Moneda
              <select
                value={formCosto.monedaCodigo ?? ''}
                onChange={(e) => setFormCosto((f) => ({ ...f, monedaCodigo: e.target.value || null }))}
              >
                <option value="">(la de la liquidación)</option>
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label>
              Tipo de cambio
              <input
                type="number" step="0.0001" value={formCosto.tipoCambio ?? ''}
                onChange={(e) => setFormCosto((f) => ({ ...f, tipoCambio: e.target.value ? Number(e.target.value) : null }))}
              />
            </label>
            <label>
              Método de distribución
              <select
                value={formCosto.metodoDistribucionId ?? ''}
                onChange={(e) => setFormCosto((f) => ({ ...f, metodoDistribucionId: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">(el del tipo de costo)</option>
                {metodos.map((m) => (
                  <option key={m.metodoDistribucionId} value={m.metodoDistribucionId}>{m.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              Proveedor (Id)
              <input
                type="number" value={formCosto.proveedorId ?? ''}
                onChange={(e) => setFormCosto((f) => ({ ...f, proveedorId: e.target.value ? Number(e.target.value) : null }))}
              />
            </label>
            <label>
              Cuenta contable (Id)
              <input
                type="number" value={formCosto.cuentaContableId ?? ''}
                onChange={(e) => setFormCosto((f) => ({ ...f, cuentaContableId: e.target.value ? Number(e.target.value) : null }))}
              />
            </label>
            <label>
              Tipo documento
              <input
                value={formCosto.tipoDocumento ?? ''}
                onChange={(e) => setFormCosto((f) => ({ ...f, tipoDocumento: e.target.value }))}
                placeholder="FACTURA"
              />
            </label>
            <label>
              Serie
              <input value={formCosto.serie ?? ''} onChange={(e) => setFormCosto((f) => ({ ...f, serie: e.target.value }))} />
            </label>
            <label>
              Número documento
              <input
                value={formCosto.numeroDocumento ?? ''}
                onChange={(e) => setFormCosto((f) => ({ ...f, numeroDocumento: e.target.value }))}
              />
            </label>
            <label className="lc-form-full">
              Observación
              <input
                value={formCosto.observacion ?? ''}
                onChange={(e) => setFormCosto((f) => ({ ...f, observacion: e.target.value }))}
              />
            </label>
            <div className="lc-form-actions">
              <button type="button" className="secondary-button" onClick={() => { setMostrarFormCosto(false); setFormCosto(FORM_COSTO_VACIO); }}>
                Cancelar
              </button>
              <button type="submit" className="primary-button" disabled={guardandoCosto}>
                {guardandoCosto ? 'Guardando…' : 'Guardar concepto'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ---------- Cálculo de distribución ---------- */}
      <div className="lc-section">
        <h2>Distribución de costos</h2>

        {hayCostoManual && editable && (
          <div className="lc-panel lc-panel-warning" style={{ marginBottom: 12 }}>
            <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Hay un concepto con método <strong>MANUAL</strong>. La carga de porcentajes manuales por línea de
            compra aún no está disponible desde esta pantalla — el cálculo fallará hasta que ese concepto
            use otro método, o se agregue esa funcionalidad.
          </div>
        )}

        {editable && liquidacion.costos.length > 0 && (
          <button className="primary-button" onClick={onCalcular} disabled={calculando}>
            <Calculator size={16} /> {calculando ? 'Calculando…' : 'Calcular distribución'}
          </button>
        )}

        {calculo && (
          <div className="lc-panel" style={{ marginTop: 12 }}>
            <div className="lc-table-wrap">
              <table className="lc-table">
                <thead>
                  <tr>
                    <th>Producto</th><th>Cantidad</th><th>Costo compra</th>
                    <th>Costo adicional</th><th>Costo final</th><th>Costo asignado</th>
                  </tr>
                </thead>
                <tbody>
                  {calculo.items.map((it) => (
                    <tr key={it.productoId}>
                      <td>{it.producto}</td>
                      <td className="numero">{it.cantidad}</td>
                      <td className="numero">{it.costoCompraUnitario.toFixed(4)}</td>
                      <td className="numero">{it.costoUnitarioAdicional.toFixed(4)}</td>
                      <td className="numero">{it.costoUnitarioFinal.toFixed(4)}</td>
                      <td className="numero">{it.costoTotalAsignado.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Confirmación ---------- */}
      {liquidacion.estado !== 'ANULADO' && (
        <div className="lc-section">
          <h2>Confirmación</h2>

          {liquidacion.estado === 'CONFIRMADO' ? (
            <div className="lc-panel">
              <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: '#2c7a3d' }} />
              Liquidación confirmada. Asiento contable N° <strong>{liquidacion.asientoContableId ?? '—'}</strong>.
            </div>
          ) : (
            <div className="lc-panel">
              <p style={{ marginTop: 0, fontSize: '0.85rem', color: '#6b6a60' }}>
                Debes calcular la distribución antes de confirmar. Al confirmar se genera el asiento contable
                y se revaloriza el inventario — esta acción no se puede deshacer.
              </p>
              <div className="lc-form-costo" style={{ border: 'none', padding: 0 }}>
                <label>
                  Cuenta de mercadería (Id, opcional)
                  <input
                    type="number"
                    value={cuentaMercaderiaId}
                    onChange={(e) => setCuentaMercaderiaId(e.target.value)}
                    placeholder="Por defecto: código 201"
                  />
                </label>
                <div className="lc-form-actions">
                  <button
                    className="primary-button"
                    onClick={onConfirmar}
                    disabled={confirmando || liquidacion.estado !== 'CALCULADO'}
                  >
                    <CheckCircle2 size={16} /> {confirmando ? 'Confirmando…' : 'Confirmar liquidación'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {confirmacion && (
            <div className="lc-panel" style={{ marginTop: 12 }}>
              Asiento <strong>{confirmacion.numeroAsiento}</strong> — Debe {confirmacion.totalDebe.toFixed(2)} /
              Haber {confirmacion.totalHaber.toFixed(2)} — {confirmacion.productosRevalorizados} producto(s) revalorizado(s).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
