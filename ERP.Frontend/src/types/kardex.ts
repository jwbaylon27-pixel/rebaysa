export interface KardexFiltro {
    productoId: number;
    almacenId: number;
    tipoMovimiento: string;
    fechaInicio: string;
    fechaFin: string;
}

export interface KardexMovimiento {
    id: number;
    productoId: number;
    codigoProducto: string;
    producto: string;
    almacenId: number;
    almacen: string;
    tipoMovimiento: string;
    documento: string;
    documentoId: number;
    entrada: number;
    salida: number;
    stockAnterior: number;
    stockActual: number;
    costoUnitario: number;
    costoTotal: number;
    fecha: string;
    usuarioId: number;
    usuario: string;
}

export interface KardexDetalle {
    id: number;
    movimientoId: number;
    productoId: number;
    codigoProducto: string;
    producto: string;
    almacenId: number;
    almacen: string;
    tipoMovimiento: string;
    documento: string;
    documentoId: number;
    entrada: number;
    salida: number;
    stockAnterior: number;
    stockActual: number;
    costoUnitario: number;
    costoTotal: number;
    fecha: string;
    usuario: string;
}

export interface KardexResumen {
    productoId: number;
    codigo: string;
    descripcion: string;
    stockActual: number;
    costoPromedio: number;
    valorInventario: number;
    entradas: number;
    salidas: number;
    almacen: string;
}
