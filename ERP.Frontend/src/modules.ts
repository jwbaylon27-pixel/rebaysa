export type ModuleStatus = 'activo' | 'planeado';

export type AppModule = {
  name: string;
  description: string;
  status: ModuleStatus;
  /**
   * Sección (subgrupo) del menú lateral donde se agrupa el módulo. Solo se usa en el grupo
   * 'Frontend'. Los módulos sin sección se muestran al final, en "Otros".
   */
  section?: string;
};

export type ModuleGroup = {
  group: 'Backend' | 'Frontend';
  modules: AppModule[];
};

export const moduleGroups: ModuleGroup[] = [
  {
    group: 'Backend',
    modules: [
      { name: 'Auth', description: 'Autenticacion, tokens y recuperacion de cuenta.', status: 'planeado' },
      { name: 'Usuarios', description: 'Administracion de usuarios del sistema.', status: 'planeado' },
      { name: 'Roles', description: 'Perfiles, permisos y acceso por modulo.', status: 'planeado' },
      { name: 'Productos', description: 'Catalogo de repuestos, marcas y categorias.', status: 'activo' },
      { name: 'Inventario', description: 'Stock, ajustes y movimientos internos.', status: 'planeado' },
      { name: 'Compras', description: 'Compras, proveedores y cuentas por pagar.', status: 'activo' },
      { name: 'Ventas', description: 'Ventas, comprobantes y cuentas por cobrar.', status: 'activo' },
      { name: 'Kardex', description: 'Historial valorizado de entradas y salidas.', status: 'planeado' },
      { name: 'SocioNegocio', description: 'Clientes y proveedores centralizados por TipoSocio.', status: 'activo' },
      { name: 'Vehiculos', description: 'Vehiculos asociados a clientes.', status: 'planeado' },
      { name: 'Dashboard', description: 'Indicadores y resumen operativo.', status: 'activo' },
      { name: 'Alertas', description: 'Stock minimo, pendientes y vencimientos.', status: 'planeado' },
      { name: 'Reportes', description: 'Reportes de ventas, compras e inventario.', status: 'planeado' },
    ],
  },
  {
    group: 'Frontend',
    modules: [
      // ---- Principal ----
      { section: 'Principal', name: 'Dashboard', description: 'Vista inicial con metricas clave.', status: 'activo' },

      // ---- Mantenimiento ----
      { section: 'Mantenimiento', name: 'Productos', description: 'Mantenimiento de productos.', status: 'activo' },
      { section: 'Mantenimiento', name: 'Clientes', description: 'Socios tipo C para ventas y cuentas por cobrar.', status: 'activo' },
      { section: 'Mantenimiento', name: 'Proveedores', description: 'Socios tipo P para compras y cuentas por pagar.', status: 'activo' },
      { section: 'Mantenimiento', name: 'Tipo de Cambio', description: 'Tipo de cambio diario PEN/USD para compras, ventas y costeo.', status: 'activo' },

      // ---- Operaciones ----
      { section: 'Operaciones', name: 'Compras', description: 'Registro y consulta de compras.', status: 'activo' },
      { section: 'Operaciones', name: 'Ventas', description: 'Registro y consulta de ventas.', status: 'activo' },
      { section: 'Operaciones', name: 'Cobros', description: 'Registro de cobros de facturas al crédito.', status: 'activo' },
      { section: 'Operaciones', name: 'Notas de Crédito', description: 'Anular total o parcialmente una venta ya registrada.', status: 'activo' },

      // ---- Inventario y Costos ----
      { section: 'Inventario y Costos', name: 'Inventario', description: 'Stock actual y ajustes.', status: 'planeado' },
      { section: 'Inventario y Costos', name: 'Kardex', description: 'Movimientos por producto.', status: 'activo' },
      { section: 'Inventario y Costos', name: 'Liquidación de Costo', description: 'Costeo de importación y revalorización de inventario.', status: 'activo' },

      // ---- Reportes ----
      { section: 'Reportes', name: 'Reportes', description: 'Reportes operativos.', status: 'planeado' },

      // ---- Sistema ----
      { section: 'Sistema', name: 'Login', description: 'Ingreso seguro al sistema.', status: 'planeado' },
      { section: 'Sistema', name: 'Configuracion', description: 'Empresa, usuarios, roles y parametros.', status: 'planeado' },
    ],
  },
];
