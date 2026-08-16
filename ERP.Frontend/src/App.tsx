import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Pencil,Trash2,Plus,X} from "lucide-react";
import RegistrarCompra from "./components/RegistrarCompra";
import RegistrarVenta from "./components/RegistrarVenta"; // 👈 importar nuevo componente
import Movimientos from "./components/Movimientos";
import Dashboard from "./components/Dashboard";
import logo from "./assets/Logo1.png";
import MovimientosInventario from "./components/MovimientosInventario/MovimientosInventario";
import {
  actualizarProducto,
  crearProducto,
  eliminarProducto,
  listarCategorias,
  listarMarcas,
  listarProductos,
} from './api/productos';
import {
  actualizarSocioNegocio,
  crearSocioNegocio,
  eliminarSocioNegocio,
  listarSociosNegocio,
} from './api/sociosNegocio';
import { moduleGroups, type AppModule, type ModuleGroup } from './modules';
import type { Categorias, Marca, Producto, ProductoForm } from './types';
import type { SocioNegocio, SocioNegocioForm } from './types/socioNegocio';
import ProcesoComercial from "./components/ProcesoComercial";
import SociosNegocio from "./components/SociosNegocio";
import { ThemeProvider, CssBaseline } from "@mui/material";
import rebaysaTheme from "./theme/rebaysaTheme";
import Login from './components/Login';
import { cerrarSesion, guardarSesion, obtenerSesion, type Sesion } from './auth';

const productoInicial: ProductoForm = {
  categoriaId: 1,
  marcaId: 1,
  codigo: '',
  nombre: '',
  unidadMedida: 'UND',
  precioCompra: 0,
  precioVenta: 0,
  stockMinimo: 0,
  stock: 0,
  activo:true
};

type ModuleForm = AppModule & {
  group: ModuleGroup['group'];
  originalGroup?: ModuleGroup['group'];
  originalName?: string;
};

type FlatModule = AppModule & {
  group: ModuleGroup['group'];
};

const moduloInicial: ModuleForm = {
  group: 'Frontend',
  name: '',
  description: '',
  status: 'planeado',
};

const MODULOS_STORAGE_KEY = 'rebaysa.modulos';

const permisosPorRol: Record<Sesion['rol'], string[]> = {
  ADMINISTRADOR: ['*'],
  VENDEDOR: ['Dashboard', 'Productos', 'Ventas', 'Clientes'],
  ALMACENERO: ['Dashboard', 'Productos', 'Compras', 'Kardex', 'Proveedores'],
};

function cargarModulosIniciales() {
  try {
    const modulosGuardados = localStorage.getItem(MODULOS_STORAGE_KEY);

    if (!modulosGuardados) {
      return moduleGroups;
    }

    const guardados = JSON.parse(modulosGuardados) as ModuleGroup[];

    return moduleGroups.map((group) => {
      const grupoGuardado = guardados.find((item) => item.group === group.group);
      const modulosGuardadosPorNombre = new Map(
        grupoGuardado?.modules.map((module) => [module.name, module]) ?? [],
      );
      const modulosBase = group.modules.map((module) => modulosGuardadosPorNombre.get(module.name) ?? module);
      const modulosPersonalizados =
        grupoGuardado?.modules.filter(
          (module) => !group.modules.some((moduloBase) => moduloBase.name === module.name),
        ) ?? [];

      return {
        ...group,
        modules: [...modulosBase, ...modulosPersonalizados],
      };
    });
  } catch {
    return moduleGroups;
  }
}

function App() {
  const [sesion, setSesion] = useState<Sesion | null>(obtenerSesion);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [socios, setSocios] = useState<SocioNegocio[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [categorias, setCategorias] = useState<Categorias[]>([]);
  const [modulos, setModulos] = useState<ModuleGroup[]>(cargarModulosIniciales);
  const [moduloActivo, setModuloActivo] = useState('Productos');
  const [moduloForm, setModuloForm] = useState<ModuleForm>(moduloInicial);
  const [form, setForm] = useState<ProductoForm>(productoInicial);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cargandoSocios, setCargandoSocios] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoSocio, setGuardandoSocio] = useState(false);
  const [error, setError] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const frontendModules = useMemo(
    () => modulos.find((group) => group.group === 'Frontend')?.modules ?? [],
    [modulos],
  );

  const frontendModulesPermitidos = useMemo(() => {
    if (!sesion) return [];
    const permisos = permisosPorRol[sesion.rol];
    return frontendModules.filter((module) => permisos.includes('*') || permisos.includes(module.name));
  }, [frontendModules, sesion]);

  const puedeGestionarInventario = sesion?.rol === 'ADMINISTRADOR' || sesion?.rol === 'ALMACENERO';

  const backendModules = useMemo(
    () => modulos.find((group) => group.group === 'Backend')?.modules ?? [],
    [modulos],
  );

  const modulosPlano = useMemo<FlatModule[]>(
    () =>
      modulos.flatMap((group) =>
        group.modules.map((module) => ({
          ...module,
          group: group.group,
        })),
      ),
    [modulos],
  );

  const moduloActivoInfo =
    frontendModules.find((module) => module.name === moduloActivo) ??
    modulosPlano.find((module) => module.name === moduloActivo);

const productosFiltrados = useMemo(() => {
  const texto = busqueda.toLowerCase().trim();

  if (!texto) return productos;

  return productos.filter((producto) => {
    const marca =
      marcas.find((m) => m.id === producto.marcaId)?.nombre ?? '';

    const estado = producto.activo ? 'activo' : 'inactivo';

    return (
      (producto.codigo ?? '').toLowerCase().includes(texto) ||
      (producto.nombre ?? '').toLowerCase().includes(texto) ||
      marca.toLowerCase().includes(texto) ||
      estado.includes(texto)
    );
  });
}, [productos, busqueda, marcas]);

  useEffect(() => {
    listarMarcas().then(setMarcas);
    listarCategorias().then(setCategorias);
  }, []);

  useEffect(() => {
    localStorage.setItem(MODULOS_STORAGE_KEY, JSON.stringify(modulos));
  }, [modulos]);

  useEffect(() => {
    void cargarProductos();
    void cargarSocios();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [moduloActivo]);

  useEffect(() => {
    if (sesion && !frontendModulesPermitidos.some((module) => module.name === moduloActivo)) {
      setModuloActivo(frontendModulesPermitidos[0]?.name ?? 'Dashboard');
    }
  }, [sesion, frontendModulesPermitidos, moduloActivo]);

  async function cargarProductos() {
    try {
      setCargando(true);
      setError('');
      setProductos(await listarProductos());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos.');
    } finally {
      setCargando(false);
    }
  }

  async function cargarSocios() {
    try {
      setCargandoSocios(true);
      setError('');
      setSocios(await listarSociosNegocio());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los socios de negocio.');
    } finally {
      setCargandoSocios(false);
    }
  }

/*  async function guardarSocio(socio: SocioNegocioForm) {
    console.log("SOCIO");
    console.log(socio);
    try {
      setGuardandoSocio(true);
      setError('');

      if (socio.id) {
        await actualizarSocioNegocio(socio.id,socio);
      } else {
        await crearSocioNegocio(socio);
      }

      await cargarSocios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el socio de negocio.');
    } finally {
      setGuardandoSocio(false);
    }
  }
*/

async function guardarSocio(
  socio: SocioNegocioForm) {
  try {
    setGuardandoSocio(true);
    setError("");
    if (socio.id && socio.id > 0) {
      await actualizarSocioNegocio(
        socio.id,
        socio
      );
    }
    else {
      await crearSocioNegocio(
        socio);
    }
    await cargarSocios();
  }
  catch (err) {
    setError(
      err instanceof Error
      ? err.message
      : "No se pudo guardar"
    );
  }
  finally {
    setGuardandoSocio(false);
  }
}
  async function desactivarSocio(id: number) {
    try {
      setError('');
      await eliminarSocioNegocio(id);
      await cargarSocios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desactivar el socio de negocio.');
    }
  }

  function actualizarCampo<K extends keyof ProductoForm>(campo: K, valor: ProductoForm[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  function actualizarModulo<K extends keyof ModuleForm>(campo: K, valor: ModuleForm[K]) {
    setModuloForm((actual) => ({ ...actual, [campo]: valor }));
  }

  function editar(producto: Producto) {
    setModuloActivo('Productos');
    setForm({
      id: producto.id,
      categoriaId: producto.categoriaId,
      marcaId: producto.marcaId,
      codigo: producto.codigo,
      nombre: producto.nombre,
      unidadMedida: producto.unidadMedida ?? '',
      precioCompra: producto.precioCompra,
      precioVenta: producto.precioVenta,
      stockMinimo: producto.stockMinimo,
      stock: producto.stock,
      activo: producto.activo,
    });
     setMostrarModal(true);
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setGuardando(true);
      setError('');

      if (form.id) {
        await actualizarProducto({ ...form, activo: form.activo ?? true });
      } else {
        await crearProducto(form);
      }

      setForm(productoInicial);
      await cargarProductos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el producto.');
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar(id: number) {
    if (!confirm('Desea desactivar este producto?')) {
      return;
    }

    try {
      setError('');
      await eliminarProducto(id);
      await cargarProductos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desactivar el producto.');
    }
  }

  function editarModulo(module: FlatModule) {
    setModuloForm({
      group: module.group,
      name: module.name,
      description: module.description,
      status: module.status,
      originalGroup: module.group,
      originalName: module.name,
    });
  }

  function eliminarModulo(groupName: ModuleGroup['group'], moduleName: string) {
    if (!confirm(`Desea eliminar el modulo ${moduleName}?`)) {
      return;
    }

    setModulos((actual) =>
      actual.map((group) =>
        group.group === groupName
          ? { ...group, modules: group.modules.filter((module) => module.name !== moduleName) }
          : group,
      ),
    );

    if (moduloActivo === moduleName) {
      setModuloActivo('Productos');
    }

    if (moduloForm.originalGroup === groupName && moduloForm.originalName === moduleName) {
      setModuloForm(moduloInicial);
    }
  }

  function guardarModulo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const modulo: AppModule = {
      name: moduloForm.name.trim(),
      description: moduloForm.description.trim(),
      status: moduloForm.status,
    };

    if (!modulo.name || !modulo.description) {
      setError('Completa el nombre y la descripcion del modulo.');
      return;
    }

    setError('');
    setModulos((actual) => {
      const sinModuloAnterior = actual.map((group) =>
        group.group === moduloForm.originalGroup
          ? {
              ...group,
              modules: group.modules.filter((module) => module.name !== moduloForm.originalName),
            }
          : group,
      );

      return sinModuloAnterior.map((group) =>
        group.group === moduloForm.group ? { ...group, modules: [...group.modules, modulo] } : group,
      );
    });
    setModuloActivo(modulo.name);
    setModuloForm(moduloInicial);
  }

  function renderDashboard() {
    const backendActivos = backendModules.filter((module) => module.status === 'activo').length;
    const frontendActivos = frontendModules.filter((module) => module.status === 'activo').length;
    const clientes = socios.filter((socio) => socio.tipoSocio === 'C');
    const proveedores = socios.filter((socio) => socio.tipoSocio === 'P');

    return (
      <section className="dashboard-grid">
        <article className="module-summary panel">
          <span>Backend</span>
          <strong>
            {backendActivos}/{backendModules.length}
          </strong>
          <p>modulos activos</p>
        </article>
        <article className="module-summary panel">
          <span>Frontend</span>
          <strong>
            {frontendActivos}/{frontendModules.length}
          </strong>
          <p>modulos activos</p>
        </article>
        <article className="module-summary panel highlight">
          <span>Productos</span>
          <strong>{productosFiltrados.length}</strong>
          <p>productos cargados</p>
        </article>
        <article className="module-summary panel">
          <span>Clientes</span>
          <strong>{clientes.length}</strong>
          <p>socios tipo C</p>
        </article>
        <article className="module-summary panel">
          <span>Proveedores</span>
          <strong>{proveedores.length}</strong>
          <p>socios tipo P</p>
        </article>
      </section>
    );
  }

function renderProductos() {
  return (
    <section className="inventory-page">
      <div className="panel inventory-panel">

        <div className="list-toolbar">

          <div>
            <h2>Productos</h2>
            <p>Administración de inventario</p>
          </div>

          <div className="toolbar-actions">

            <input
              type="text"
              className="search-input"
              placeholder="🔍 Buscar producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            {puedeGestionarInventario && <button
              type="button"
              className="primary-button"
              onClick={() => {
                setForm(productoInicial);
                setMostrarModal(true);
              }}
            >
              <Plus size={18} />
              Nuevo Producto
            </button>}

          </div>

        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Marca</th>
                <th>P.Venta</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={7}>Cargando productos...</td>
                </tr>
              ) : productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7}>No hay productos para mostrar.</td>
                </tr>
              ) : (
                productosFiltrados.map((producto) => (
                  <tr key={producto.id}>
                    <td>{producto.codigo}</td>

                    <td>
                      <strong>{producto.nombre}</strong>
                      <span className="unit-inline">
                        {producto.unidadMedida || "Sin unidad"}
                      </span>
                    </td>

                    <td>
                      {marcas.find((m) => m.id === producto.marcaId)?.nombre ??
                        producto.marcaId}
                    </td>

                    <td className="price-cell">
                      S/ {Number(producto.precioVenta ?? 0).toFixed(2)}
                    </td>
                    <td>{producto.stock ?? 0}</td>
                      <td>
                        <span
                          className={
                            producto.activo
                              ? "status-pill active"
                              : "status-pill inactive"
                          }
                        >
                          {producto.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                    <td>
                      <div className="actions">
                        {puedeGestionarInventario && <button
                          className="icon-btn edit"
                          type="button"
                          onClick={() => editar(producto)}
                        >
                          <Pencil size={18} />
                        </button>}

                        {puedeGestionarInventario && <button
                          className="icon-btn delete"
                          type="button"
                          onClick={() => void desactivar(producto.id)}
                        >
                          <Trash2 size={18} />
                        </button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}
  function renderConfiguracion() {
    return (
      <section className="module-crud-grid">
        <form className="panel module-form panel-accent" onSubmit={guardarModulo}>
          <div className="panel-title">
            <div>
              <h2>{moduloForm.originalName ? 'Editar modulo' : 'Nuevo modulo'}</h2>
              <p>Administra los modulos visibles del sistema.</p>
            </div>
            {moduloForm.originalName && (
              <button className="link-button" type="button" onClick={() => setModuloForm(moduloInicial)}>
                Cancelar
              </button>
            )}
          </div>

          <div className="form-row">
            <label>
              Grupo
              <select
                value={moduloForm.group}
                onChange={(event) => actualizarModulo('group', event.target.value as ModuleGroup['group'])}
              >
                <option value="Backend">Backend</option>
                <option value="Frontend">Frontend</option>
              </select>
            </label>

            <label>
              Estado
              <select
                value={moduloForm.status}
                onChange={(event) => actualizarModulo('status', event.target.value as AppModule['status'])}
              >
                <option value="activo">Activo</option>
                <option value="planeado">Planeado</option>
              </select>
            </label>
          </div>

          <label>
            Nombre
            <input
              required
              value={moduloForm.name}
              onChange={(event) => actualizarModulo('name', event.target.value)}
            />
          </label>

          <label>
            Descripcion
            <textarea
              required
              value={moduloForm.description}
              onChange={(event) => actualizarModulo('description', event.target.value)}
            />
          </label>

          <button className="primary-button" type="submit">
            {moduloForm.originalName ? 'Guardar cambios' : 'Crear modulo'}
          </button>
        </form>

        <section className="panel module-list-panel">
          <div className="list-toolbar">
            <div>
              <h2>CRUD de modulos</h2>
              <p>{modulosPlano.length} modulos configurados</p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="module-table">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Modulo</th>
                  <th>Estado</th>
                  <th>Descripcion</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {modulosPlano.map((module) => (
                  <tr key={`${module.group}-${module.name}`}>
                    <td>{module.group}</td>
                    <td>
                      <strong>{module.name}</strong>
                    </td>
                    <td>
                      <span className={module.status === 'activo' ? 'status-pill active' : 'status-pill'}>
                        {module.status === 'activo' ? 'Activo' : 'Planeado'}
                      </span>
                    </td>
                    <td>{module.description}</td>
                    <td>
                      <div className="actions">
                        <button type="button" onClick={() => editarModulo(module)}>
                          Editar
                        </button>
                        <button
                          className="danger-button"
                          type="button"
                          onClick={() => eliminarModulo(module.group, module.name)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    );
  }

  function renderModuloPlaneado() {
    const modulo = moduloActivoInfo;

    return (
      <section className="placeholder-panel panel">
        <span>{modulo?.status === 'activo' ? 'Activo' : 'Planeado'}</span>
        <h2>{moduloActivo}</h2>
        <p>{modulo?.description ?? 'Modulo preparado para implementacion.'}</p>
        <div className="placeholder-actions">
          <button className="primary-button" type="button" onClick={() => setModuloActivo('Configuracion')}>
            Administrar modulos
          </button>
          <button className="secondary-soft-button" type="button" onClick={() => setModuloActivo('Productos')}>
            Ir a Productos
          </button>
        </div>
      </section>
    );
  }

  function renderContenido() {
    if (moduloActivo === "Clientes") {
      return (
        <SociosNegocio
          cargando={cargandoSocios}
          guardando={guardandoSocio}
          socios={socios}
          tipoSocio="C"
          onEliminar={desactivarSocio}
          onGuardar={guardarSocio}
        />
      );
    }

    if (moduloActivo === "Proveedores") {
      return (
        <SociosNegocio
          cargando={cargandoSocios}
          guardando={guardandoSocio}
          socios={socios}
          tipoSocio="P"
          onEliminar={desactivarSocio}
          onGuardar={guardarSocio}
        />
      );
    }

    if (moduloActivo === "Compras") {
      const proveedores = socios.filter(s => s.tipoSocio === "P" && s.activo);
      return <RegistrarCompra productos={productos} socios={proveedores} />;
    }

    //if (moduloActivo === 'Ventas') {
    //  return <ProcesoComercial productos={productos} socios={socios} tipo="venta" />;
    //}

    if (moduloActivo === "Ventas") {
      const clientes = socios.filter(s => s.tipoSocio === "C" && s.activo);
      return <RegistrarVenta productos={productos} socios={clientes} />;
    }

    if (moduloActivo === "Dashboard") {
      //return <Movimientos />;
      return <Dashboard/>;
    }

    if (moduloActivo === 'Productos') {
      return renderProductos();
    }

    if (moduloActivo === 'Kardex') {
       return <MovimientosInventario />;
    }
    if (moduloActivo === 'Configuracion') {
      return renderConfiguracion();
    }

    return renderModuloPlaneado();
  }

  if (!sesion) {
    return <Login onAuthenticated={(nuevaSesion) => { guardarSesion(nuevaSesion); setSesion(nuevaSesion); }} />;
  }

  return (
    <ThemeProvider theme={rebaysaTheme}>
    <CssBaseline />
    <div>
    <main className="app-shell">
      <div className="app-layout">
        <aside className="module-sidebar panel">
          <div className="sidebar-brand">
            <img src={logo} alt="REBAYSA" className="sidebar-logo" />
          </div>
          <div className="module-sidebar-title">
            <span>ERP</span>
            <strong>Modulos</strong>
          </div>
          <div className="session-summary">
            <strong>{sesion.nombreCompleto}</strong>
            <span>{sesion.rol}</span>
            <button type="button" onClick={() => { cerrarSesion(); setSesion(null); }}>Cerrar sesión</button>
          </div>
          <nav className="module-nav" aria-label="Modulos principales">
            {frontendModulesPermitidos.map((module) => (
              <button
                className={module.name === moduloActivo ? 'module-link active' : 'module-link'}
                key={module.name}
                type="button"
                onClick={() => setModuloActivo(module.name)}
              >
                <span>{module.name}</span>
                <small>{module.status === 'activo' ? 'Activo' : 'Planeado'}</small>
              </button>
            ))}
          </nav>
        </aside>

        <div className="app-content-column">
          {error && <div className="alert">{error}</div>}

          <div className="content-stack">{renderContenido()}</div>
        </div>
      </div>
    </main>

    {mostrarModal && (
      <div className="modal-overlay">

        <div className="modal-producto">

          <div className="modal-header">

            <h2>
              {form.id
                ? 'Editar Producto'
                : 'Nuevo Producto'}
            </h2>

            <button
              type="button"
              className="close-btn"
              onClick={() => setMostrarModal(false)}
            >
              <X size={20} />
            </button>

          </div>

          <form onSubmit={guardar}>

            <label>
              Código
              <input
                value={form.codigo}
                onChange={(e) => actualizarCampo("codigo", e.target.value)}
                required
              />
            </label>

            <label>
              Nombre
              <input
                value={form.nombre}
                onChange={(e) => actualizarCampo("nombre", e.target.value)}
                required
              />
            </label>

            <div className="form-row">
              <label>
                Categoría
                <select
                  value={form.categoriaId}
                  onChange={(e) =>
                    actualizarCampo("categoriaId", Number(e.target.value))
                  }
                >
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Marca
                <select
                  value={form.marcaId}
                  onChange={(e) =>
                    actualizarCampo("marcaId", Number(e.target.value))
                  }
                >
                  {marcas.map((marca) => (
                    <option key={marca.id} value={marca.id}>
                      {marca.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-row">
              <label>
                Unidad Medida
                <input
                  value={form.unidadMedida}
                  onChange={(e) =>
                    actualizarCampo("unidadMedida", e.target.value)
                  }
                />
              </label>

              <label>
                Stock Mínimo
                <input
                  type="number"
                  value={form.stockMinimo}
                  onChange={(e) =>
                    actualizarCampo("stockMinimo", Number(e.target.value))
                  }
                />
              </label>
              <label>
                Stock 
                <input
                  type="number"
                  value={form.stock}
                  disabled
                />
              </label>            
              <label>
                Estado
                <select
                  value={form.activo ? "true" : "false"}
                  onChange={(e) =>
                    actualizarCampo("activo", e.target.value === "true")
                  }
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </label>

            </div>
            <div className="form-row">
              <label>
                Precio Compra
                <input
                  type="number"
                  step="0.01"
                  value={form.precioCompra}
                  onChange={(e) =>
                    actualizarCampo("precioCompra", Number(e.target.value))
                  }
                />
              </label>

              <label>
                Precio Venta
                <input
                  type="number"
                  step="0.01"
                  value={form.precioVenta}
                  onChange={(e) =>
                    actualizarCampo("precioVenta", Number(e.target.value))
                  }
                />
              </label>
            </div>

            <button
              className="primary-button"
              disabled={guardando}
              type="submit"
            >
              {guardando
                ? 'Guardando...'
                : 'Guardar Producto'}
            </button>

          </form>

        </div>

      </div>
    )}
  </div>
  </ThemeProvider>
);
}
export default App;
