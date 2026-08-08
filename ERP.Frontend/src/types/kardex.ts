export interface KardexFiltro {
    productoId: number;
    almacenId: number;
    tipoMovimiento: string;
    fechaInicio: string;
    fechaFin: string;
}

export interface KardexMovimiento {
    id: number;
    fecha: string;
    tipoMovimiento: string;
    referencia: string;
    cantidad: number;
    entrada: number;
    salida: number;
    stockAnterior: number;
    stockNuevo: number;
    costoUnitario: number;
}

export interface KardexDetalle {
    movimientoId: number;
    productoId: number;
    almacenId: number;
    tipoMovimiento: string;
    documento: string;
    documentoId: number;
    entrada: number;
    salida: number;
    stockAnterior: number;
    stockActual: number;
    costoUnitario: number;
    costoTotal: number;
    usuarioId: number;
    fecha: string;
}

export interface KardexResumen {
    stockActual: number;
    costoPromedio: number;
    valorInventario: number;
    entradas: number;
    salidas: number;
}
