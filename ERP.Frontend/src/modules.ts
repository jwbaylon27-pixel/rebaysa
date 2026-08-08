export type ModuleStatus = 'activo' | 'planeado';

export type AppModule = {
  name: string;
  description: string;
  status: ModuleStatus;
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
      { name: 'Login', description: 'Ingreso seguro al sistema.', status: 'planeado' },
      { name: 'Dashboard', description: 'Vista inicial con metricas clave.', status: 'activo' },
      { name: 'Productos', description: 'Mantenimiento de productos.', status: 'activo' },
      { name: 'Compras', description: 'Registro y consulta de compras.', status: 'activo' },
      { name: 'Ventas', description: 'Registro y consulta de ventas.', status: 'activo' },
      { name: 'Inventario', description: 'Stock actual y ajustes.', status: 'planeado' },
      { name: 'Kardex', description: 'Movimientos por producto.', status: 'activo' },
      { name: 'Clientes', description: 'Socios tipo C para ventas y cuentas por cobrar.', status: 'activo' },
      { name: 'Proveedores', description: 'Socios tipo P para compras y cuentas por pagar.', status: 'activo' },
      { name: 'Reportes', description: 'Reportes operativos.', status: 'planeado' },
      { name: 'Configuracion', description: 'Empresa, usuarios, roles y parametros.', status: 'planeado' },
    ],
  },
];
