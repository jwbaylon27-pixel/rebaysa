export type Producto = {
  id: number;
  categoriaId: number;
  marcaId: number;
  codigo: string;
  nombre: string;
  unidadMedida?: string | null;
  precioCompra: number;
  precioVenta: number;
  stockMinimo: number;
  stock: number;
  activo: boolean;
};

export type ProductoForm = Omit<Producto, 'id' | 'activo'> & {
  id?: number;
  activo?: boolean;
};

export type Marca = {
  id: number;
  nombre: string;
  activo: boolean;
};

export type Categorias = {
  id: number;
  nombre: string;
  activo: boolean;
};
export interface CompraForm {
  socioId: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  usuarioId?: number;
  tipoDocumento: string;
  serie: string;
  numeroDocumento: string;
  observacion?: string;
}

export interface Compra {
  id: number;
  fecha: string;
  proveedorId: number;
  proveedor: string;
  detalles: CompraDetalle[];
  subTotal: number;
  igv: number;
  total: number;
  estado: string;
}

export interface CompraDetalle {
  id: number;
  productoId: number;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}