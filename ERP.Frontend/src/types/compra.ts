export interface CompraDetalle {
    productoId: number;
    codigo: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    total: number;
}

export interface Compra {
    proveedorId: number;
    fecha: string;
    tipoDocumento: string;
    serie: string;
    numeroDocumento: string;
    observacion: string;

    subTotal: number;
    igv: number;
    total: number;

    detalles: CompraDetalle[];
}