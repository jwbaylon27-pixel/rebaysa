import api from "./api";

import {
    KardexDetalle,
    KardexFiltro,
    KardexMovimiento,
    KardexResumen
} from "../types/kardex";
//Obtener resumen del producto
export async function obtenerResumenProducto(
    productoId:number,
    almacenId:number
):Promise<KardexResumen>{

    const {data}=await api.get(
        `/kardex/resumen`,
        {
            params:{
                productoId,
                almacenId
            }
        });

    return data;
}
//Listar movimientos
export async function listarMovimientos(
    filtro:KardexFiltro
):Promise<KardexMovimiento[]>{

    const {data}=await api.get(
        "/kardex/movimientos",
        {
            params:filtro
        });

    return data;
}
//Obtener detalle
export async function obtenerDetalleMovimiento(
    movimientoId:number
):Promise<KardexDetalle>{

    const {data}=await api.get(
        `/kardex/detalle/${movimientoId}`);

    return data;
}
//Exportar Excel
export async function exportarExcel(
    filtro:KardexFiltro
){

    const response=await api.get(
        "/kardex/exportar/excel",
        {
            params:filtro,
            responseType:"blob"
        });

    return response.data;
}
//Exportar PDF
export async function exportarPDF(
    filtro:KardexFiltro
){

    const response=await api.get(
        "/kardex/exportar/pdf",
        {
            params:filtro,
            responseType:"blob"
        });

    return response.data;
}
//Imprimir Kardex
export async function imprimirKardex(
    productoId:number,
    almacenId:number
){

    const response=await api.get(
        "/kardex/imprimir",
        {
            params:{
                productoId,
                almacenId
            },
            responseType:"blob"
        });

    return response.data;
}
//Tipos de movimiento
export async function listarTiposMovimiento(){

    const {data}=await api.get(
        "/kardex/tiposmovimiento");

    return data;
}
//Almacenes
export async function listarAlmacenes(){

    const {data}=await api.get(
         "/kardex/almacenes");

    return data;
}
//Productos (Autocomplete)
export async function buscarProductos(
    texto:string
){

    const {data}=await api.get(
        "/kardex/productos",
        {
            params:{
                texto
            }
        });

    return data;
}