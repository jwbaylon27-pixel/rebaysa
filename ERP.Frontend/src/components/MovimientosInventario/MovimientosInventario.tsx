import { useEffect, useMemo, useState } from "react";

import {
    Search,
    RefreshCw,
    FileSpreadsheet,
    FileText,
    Printer,
    Plus
} from "lucide-react";
import {
    KardexDetalle,
    KardexFiltro,
    KardexMovimiento,
    KardexResumen
} from "../../types/kardex";
import {
    exportarExcel,
    exportarPDF,
    imprimirKardex,
    listarAlmacenes,
    listarMovimientos,
    listarTiposMovimiento,
    obtenerDetalleMovimiento,
    obtenerResumenProducto
} from "../../services/kardexService";

import AutocompleteProducto from "./AutocompleteProducto";
import KardexResumenCard from "./KardexResumen";
import KardexFiltros from "./KardexFiltros";
import KardexTable from "./KardexTable";
import KardexDetalleModal from "./KardexDetalleModal";

import "./movimientos.css";
interface ProductoBusqueda {
    id: number;
    codigo: string;
    descripcion: string;
    stock: number;
    stockMinimo: number;
}
interface Almacen {
    id: number;
    nombre: string;
}
interface TipoMovimiento {
    nombre: string;
}

export default function MovimientosInventario() {
    //------------------------------------------
    // ESTADOS
    //------------------------------------------
    const [producto, setProducto] =
        useState<ProductoBusqueda | null>(null);
    const [almacenId, setAlmacenId] =
        useState(1);
    const [almacenes, setAlmacenes] =
        useState<Almacen[]>([]);
    const [tiposMovimiento, setTiposMovimiento] =
        useState<TipoMovimiento[]>([]);
    const [resumen, setResumen] =
        useState<KardexResumen | null>(null);
    const [movimientos, setMovimientos] =
        useState<KardexMovimiento[]>([]);
    const [detalle, setDetalle] =
        useState<KardexDetalle | null>(null);
    const [mostrarDetalle, setMostrarDetalle] =
        useState(false);
    const [loading, setLoading] =
        useState(false);
    //------------------------------------------
    // FILTROS
    //------------------------------------------
    const [filtro, setFiltro] =
        useState<KardexFiltro>({
            productoId: 0,
            almacenId: 1,
            tipoMovimiento: "",
            fechaInicio: "",
            fechaFin: ""
        });
    //------------------------------------------
    // CARGAR CATÁLOGOS
    //------------------------------------------
    useEffect(() => {
        cargarCatalogos();
    }, []);
    //------------------------------------------
    // CUANDO CAMBIA PRODUCTO
    //------------------------------------------
    useEffect(() => {
        if (!producto) return;
        cargarResumen();
        buscarMovimientos();
    }, [producto, almacenId]);
    //------------------------------------------
    // CATÁLOGOS
    //------------------------------------------
    async function cargarCatalogos() {
        try {
            const [alm, tipos] =
                await Promise.all([
                    listarAlmacenes(),
                    listarTiposMovimiento()
                ]);
            setAlmacenes(alm);
            setTiposMovimiento(tipos);
        }
        catch (e) {
            console.error(e);
        }
    }
    //------------------------------------------
    // RESUMEN
    //------------------------------------------
    async function cargarResumen() {
        if (!producto) return;
        try {
            const data =
                await obtenerResumenProducto(
                    producto.id,
                    almacenId
                );
            setResumen(data);
        }
        catch (e) {
            console.error(e);
        }
    }
        //------------------------------------------
    // BUSCAR MOVIMIENTOS
    //------------------------------------------

    async function buscarMovimientos() {

        if (!producto)
            return;

        try {

            setLoading(true);

            const lista =
                await listarMovimientos({

                    ...filtro,

                    productoId: producto.id,

                    almacenId: almacenId

                });

            setMovimientos(lista);

        }
        catch (e) {

            console.error(e);

        }
        finally {

            setLoading(false);

        }

    }

    //------------------------------------------
    // DETALLE
    //------------------------------------------

    async function abrirDetalle(
        movimiento: KardexMovimiento
    ) {

        try {

            const data =
                await obtenerDetalleMovimiento(
                    movimiento.id
                );

            setDetalle(data);

            setMostrarDetalle(true);

        }
        catch (e) {

            console.error(e);

        }

    }

    //------------------------------------------
    // EXPORTAR EXCEL
    //------------------------------------------

    async function descargarExcel() {

        if (!producto)
            return;

        try {

            const archivo =
                await exportarExcel({

                    ...filtro,

                    productoId: producto.id,

                    almacenId

                });

            const url =
                window.URL.createObjectURL(archivo);

            window.open(url);

        }
        catch (e) {

            console.error(e);

        }

    }

    //------------------------------------------
    // EXPORTAR PDF
    //------------------------------------------

    async function descargarPDF() {

        if (!producto)
            return;

        try {

            const archivo =
                await exportarPDF({

                    ...filtro,

                    productoId: producto.id,

                    almacenId

                });

            const url =
                window.URL.createObjectURL(archivo);

            window.open(url);

        }
        catch (e) {

            console.error(e);

        }

    }

    //------------------------------------------
    // IMPRIMIR
    //------------------------------------------

    async function imprimir() {

        if (!producto)
            return;

        try {

            const archivo =
                await imprimirKardex(
                    producto.id,
                    almacenId
                );

            const url =
                window.URL.createObjectURL(archivo);

            window.open(url);

        }
        catch (e) {

            console.error(e);

        }

    }

    //------------------------------------------
    // TOTALES
    //------------------------------------------

    const totalEntradas =
        useMemo(() => {

            return movimientos.reduce(

                (total, item) =>

                    total + item.entrada,

                0

            );

        }, [movimientos]);

    const totalSalidas =
        useMemo(() => {

            return movimientos.reduce(

                (total, item) =>

                    total + item.salida,

                0

            );

        }, [movimientos]);

    const totalMovimientos =
        movimientos.length;
    //------------------------------------------
    // UI
    //------------------------------------------

    return (

        <div className="inventory-page">

            <div className="inventory-header">

                <div>

                    <h1>Kardex de Inventario</h1>

                    <p>
                        Consulta de movimientos, existencias y valorización del inventario
                    </p>

                </div>

            </div>

            <div className="inventory-card">

                <AutocompleteProducto
                    value={producto}
                    onChange={setProducto}
                />

                {
                    resumen &&
                    <KardexResumenCard
                        resumen={resumen}
                    />
                }

            </div>

            <div className="inventory-card">

                <KardexFiltros

                    filtro={filtro}

                    setFiltro={setFiltro}

                    almacenes={almacenes}

                    almacenId={almacenId}

                    setAlmacenId={setAlmacenId}

                    tiposMovimiento={tiposMovimiento}

                />

            </div>

            <div className="toolbar-buttons">

                <button
                    className="primary-button"
                    onClick={buscarMovimientos}
                    disabled={!producto}
                    title={!producto ? "Seleccione un producto primero" : undefined}
                >
                    <Search size={18}/>
                    Buscar
                </button>

                <button
                    className="secondary-button"
                    disabled={!producto}
                    title={!producto ? "Seleccione un producto primero" : undefined}
                    onClick={() => {

                        setFiltro({

                            productoId: producto?.id ?? 0,

                            almacenId,

                            tipoMovimiento: "",

                            fechaInicio: "",

                            fechaFin: ""

                        });

                        buscarMovimientos();

                    }}
                >
                    <RefreshCw size={18}/>
                    Actualizar
                </button>

                <button
                    className="secondary-button"
                    onClick={descargarExcel}
                    disabled={!producto || movimientos.length === 0}
                    title={!producto ? "Seleccione un producto primero" : undefined}
                >
                    <FileSpreadsheet size={18}/>
                    Excel
                </button>

                <button
                    className="secondary-button"
                    onClick={descargarPDF}
                    disabled={!producto || movimientos.length === 0}
                    title={!producto ? "Seleccione un producto primero" : undefined}
                >
                    <FileText size={18}/>
                    PDF
                </button>

                <button
                    className="secondary-button"
                    onClick={imprimir}
                    disabled={!producto || movimientos.length === 0}
                    title={!producto ? "Seleccione un producto primero" : undefined}
                >
                    <Printer size={18}/>
                    Imprimir
                </button>

                <button
                    className="primary-button"
                >
                    <Plus size={18}/>
                    Nuevo Movimiento
                </button>

            </div>

            <div className="inventory-summary">
                <div className="summary-card">
                    <span>Total Entradas</span>
                    <strong>
                        {totalEntradas}
                    </strong>
                </div>
                <div className="summary-card">
                    <span>Total Salidas</span>
                    <strong>
                        {totalSalidas}
                    </strong>
                </div>
                <div className="summary-card">
                    <span>Movimientos</span>
                    <strong>
                        {totalMovimientos}
                    </strong>
                </div>
            </div>
            <div className="inventory-table">
                <KardexTable
                    data={movimientos}
                    loading={loading}
                    onDetalle={abrirDetalle}
                />
            </div>
            {
                mostrarDetalle &&
                detalle &&

                <KardexDetalleModal
                    open={mostrarDetalle}
                    detalle={detalle}
                    onClose={() => {

                        setMostrarDetalle(false);

                        setDetalle(null);

                    }}
                />
            }

        </div>

    );

}