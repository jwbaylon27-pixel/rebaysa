import { Eye } from "lucide-react";
import { KardexMovimiento } from "../../types/kardex";

interface Props {
    data: KardexMovimiento[];
    loading: boolean;
    onDetalle: (movimiento: KardexMovimiento) => void;
}

export default function KardexTable({ data, loading, onDetalle }: Props) {
    if (loading) {
        return <div className="table-loading">Cargando movimientos...</div>;
    }

    if (data.length === 0) {
        return (
            <div className="table-empty">
                <h3>No existen movimientos</h3>
                <p>Seleccione un producto o modifique los filtros para ver el detalle.</p>
            </div>
        );
    }

    return (
        <div className="table-container">
            <table className="kardex-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Movimiento</th>
                        <th>Documento</th>
                        <th className="right">Cantidad</th>
                        <th className="right">Stock Anterior</th>
                        <th className="right">Stock Nuevo</th>
                        <th className="right">Costo Unitario</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item) => {
                        const esEntrada = item.entrada > 0;

                        return (
                            <tr key={item.id}>
                                <td>{new Date(item.fecha).toLocaleDateString("es-PE")}</td>
                                <td>
                                    <span className={esEntrada ? "badge badge-green" : "badge badge-red"}>
                                        {item.tipoMovimiento}
                                    </span>
                                </td>
                                <td>{item.referencia}</td>
                                <td className="right">
                                    {esEntrada ? (
                                        <span className="entrada">+{item.cantidad}</span>
                                    ) : (
                                        <span className="salida">-{item.cantidad}</span>
                                    )}
                                </td>
                                <td className="right">{item.stockAnterior}</td>
                                <td className="right">{item.stockNuevo}</td>
                                <td className="right">S/ {Number(item.costoUnitario).toFixed(2)}</td>
                                <td>
                                    <button
                                        className="icon-btn"
                                        onClick={() => onDetalle(item)}
                                        aria-label="Ver detalle del movimiento"
                                    >
                                        <Eye size={16} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
