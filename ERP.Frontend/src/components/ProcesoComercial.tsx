import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  listarMovimientosComerciales,
  registrarMovimientoComercial,
  type MovimientoComercial,
  type TipoProcesoComercial,
} from '../api/procesosComerciales';
import type { Producto } from '../types';
import type { SocioNegocio, TipoSocio } from '../types/socioNegocio';
import RegistrarCompra from "./RegistrarCompra";

type ProcesoComercialProps = {
  productos: any[];
  socios: any[];
  tipo: string;
};

const procesoMeta: Record<TipoProcesoComercial, { titulo: string; socio: string; tipoSocio: TipoSocio }> = {
  compra: { titulo: 'Compras', socio: 'Proveedor', tipoSocio: 'P' },
  venta: { titulo: 'Ventas', socio: 'Cliente', tipoSocio: 'C' },
};

export default function ProcesoComercial({ tipo, productos, socios}: ProcesoComercialProps) {
  const meta = procesoMeta[tipo];
  const sociosDisponibles = socios.filter((socio) => socio.tipoSocio === meta.tipoSocio && socio.activo);
  const productosDisponibles = productos.filter((producto) => producto.activo);
  const [movimientos, setMovimientos] = useState<MovimientoComercial[]>([]);
  const [socioId, setSocioId] = useState(0);
  const [productoId, setProductoId] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [tipoDocumento, setTipoDocumento] = useState(tipo === 'compra' ? 'FACTURA' : 'BOLETA');
  const [serie, setSerie] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [observacion, setObservacion] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const total = useMemo(
    () => movimientos.reduce((acumulado, movimiento) => acumulado + movimiento.total, 0),
    [movimientos],
  );
  if (tipo === "compra") {
    return <RegistrarCompra productos={productos} socios={socios} />;
  }
  useEffect(() => {
    void cargarMovimientos();
    setTipoDocumento(tipo === 'compra' ? 'FACTURA' : 'BOLETA');
  }, [tipo]);

  async function cargarMovimientos() {
    try {
      setCargando(true);
      setError('');
      setMovimientos(await listarMovimientosComerciales(tipo));
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudieron cargar ${meta.titulo.toLowerCase()}.`);
    } finally {
      setCargando(false);
    }
  }

  function seleccionarProducto(id: number) {
    setProductoId(id);
    const producto = productos.find((item) => item.id === id);
    setPrecioUnitario(tipo === 'compra' ? producto?.precioCompra ?? 0 : producto?.precioVenta ?? 0);
  }

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!socioId || !productoId || cantidad <= 0) {
      setError(`Selecciona ${meta.socio.toLowerCase()}, producto y cantidad.`);
      return;
    }

    try {
      setGuardando(true);
      setError('');
      await registrarMovimientoComercial(tipo, {
        socioId,
        productoId,
        cantidad,
        precioUnitario,
        usuarioId: 1,
        tipoDocumento,
        serie,
        numeroDocumento,
        metodoPago: tipo === 'venta' ? metodoPago : undefined,
        observacion,
      });
      await cargarMovimientos();
      setCantidad(1);
      setProductoId(0);
      setPrecioUnitario(0);
      setSerie('');
      setNumeroDocumento('');
      setObservacion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : `No se pudo registrar la ${tipo}.`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="process-grid">
      <form className="panel module-form panel-accent" onSubmit={registrar}>
        <div className="panel-title">
          <div>
            <h2>Registrar {tipo}</h2>
            <p>{meta.socio} y producto vinculados al proceso</p>
          </div>
        </div>

        {error && <div className="alert compact-alert">{error}</div>}

        <label>
          {meta.socio}
          <select value={socioId} onChange={(event) => setSocioId(Number(event.target.value))} required>
            <option value={0}>Seleccionar {meta.socio.toLowerCase()}</option>
            {sociosDisponibles.map((socio) => (
              <option key={socio.id} value={socio.id}>
                {socio.nombres}
              </option>
            ))}
          </select>
        </label>

        <div className="form-row">
          <label>
            Documento
            <select value={tipoDocumento} onChange={(event) => setTipoDocumento(event.target.value)}>
              <option value="FACTURA">Factura</option>
              <option value="BOLETA">Boleta</option>
              <option value="TICKET">Ticket</option>
            </select>
          </label>
          <label>
            Serie
            <input value={serie} onChange={(event) => setSerie(event.target.value)} />
          </label>
        </div>

        <div className="form-row">
          <label>
            Numero
            <input value={numeroDocumento} onChange={(event) => setNumeroDocumento(event.target.value)} />
          </label>
          {tipo === 'venta' && (
            <label>
              Metodo pago
              <select value={metodoPago} onChange={(event) => setMetodoPago(event.target.value)}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </label>
          )}
        </div>

        <label>
          Producto
          <select value={productoId} onChange={(event) => seleccionarProducto(Number(event.target.value))} required>
            <option value={0}>Seleccionar producto</option>
            {productosDisponibles.map((producto) => (
              <option key={producto.id} value={producto.id}>
                {producto.codigo} - {producto.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="form-row">
          <label>
            Cantidad
            <input min="1" type="number" value={cantidad} onChange={(event) => setCantidad(Number(event.target.value))} />
          </label>
          <label>
            Precio Unitario
            <input
              min="0"
              step="0.01"
              type="number"
              value={precioUnitario}
              onChange={(event) => setPrecioUnitario(Number(event.target.value))}
            />
          </label>
        </div>

        <label>
          Observacion
          <textarea value={observacion} onChange={(event) => setObservacion(event.target.value)} />
        </label>

        <button className="primary-button" disabled={guardando} type="submit">
          <Plus size={18} />
          {guardando ? 'Registrando...' : `Registrar ${tipo}`}
        </button>
      </form>

      <section className="panel inventory-panel">
        <div className="list-toolbar">
          <div>
            <h2>{meta.titulo}</h2>
            <p>{movimientos.length} movimientos registrados</p>
          </div>
          <div className="header-stat process-total">
            <span>Total</span>
            <strong>S/ {total.toFixed(2)}</strong>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>{meta.socio}</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={6}>Cargando movimientos...</td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6}>No hay movimientos registrados.</td>
                </tr>
              ) : (
                movimientos.map((movimiento) => {
                  const detalle = movimiento.detalles[0];

                  return (
                    <tr key={movimiento.id}>
                      <td>{new Date(movimiento.fecha).toLocaleDateString()}</td>
                      <td>{movimiento.socio}</td>
                      <td>{detalle?.producto ?? '-'}</td>
                      <td>{detalle?.cantidad ?? 0}</td>
                      <td>S/ {(detalle?.precioUnitario ?? 0).toFixed(2)}</td>
                      <td className="price-cell">S/ {movimiento.total.toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {children}
        </div>
      </section>
    </section>
  );
}
