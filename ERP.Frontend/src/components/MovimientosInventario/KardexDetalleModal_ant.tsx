import { X, Package, Calendar, FileText, Warehouse } from "lucide-react";
import { KardexDetalle } from "../../types/kardex";

interface Props {

    open: boolean;

    detalle: KardexDetalle | null;

    onClose: () => void;
}

export default function KardexDetalleModal({

    open,

    detalle,

    onClose

}: Props) {

    if (!open || !detalle)
        return null;

    return (

        <div className="modal-overlay">

            <div className="modal-card">

                <div className="modal-header">

                    <div className="modal-title">

                        <Package size={22} />

                        <h2>

                            Detalle del Movimiento

                        </h2>

                    </div>

                    <button

                        className="modal-close"

                        onClick={onClose}

                    >

                        <X size={20} />

                    </button>

                </div>

                <div className="modal-body">

                    <div className="detail-grid">

                        <div className="detail-item">

                            <label>ID Movimiento</label>

                            <span>{detalle.movimientoId}</span>

                        </div>

                        <div className="detail-item">

                            <label>Producto</label>

                            <span>{detalle.productoId}</span>

                        </div>

                        <div className="detail-item">

                            <label>Almacén</label>

                            <span>{detalle.almacenId}</span>

                        </div>

                        <div className="detail-item">

                            <label>Tipo Movimiento</label>

                            <span>

                                {detalle.tipoMovimiento}

                            </span>

                        </div>

                        <div className="detail-item">

                            <label>Documento</label>

                            <span>

                                {detalle.documento}

                            </span>

                        </div>

                        <div className="detail-item">

                            <label>Documento Id</label>

                            <span>

                                {detalle.documentoId}

                            </span>

                        </div>

                        <div className="detail-item">

                            <label>Entrada</label>

                            <span className="entrada">

                                {detalle.entrada}

                            </span>

                        </div>

                        <div className="detail-item">

                            <label>Salida</label>

                            <span className="salida">

                                {detalle.salida}

                            </span>

                        </div>

                        <div className="detail-item">

                            <label>Stock Anterior</label>

                            <span>

                                {detalle.stockAnterior}

                            </span>

                        </div>

                        <div className="detail-item">

                            <label>Stock Actual</label>

                            <span>

                                {detalle.stockActual}

                            </span>

                        </div>

                        <div className="detail-item">

                            <label>Costo Unitario</label>

                            <span>

                                S/

                                {" "}

                                {

                                    Number(detalle.costoUnitario)

                                        .toFixed(2)

                                }

                            </span>

                        </div>

                        <div className="detail-item">

                            <label>Costo Total</label>

                            <span>

                                S/

                                {" "}

                                {

                                    Number(detalle.costoTotal)

                                        .toFixed(2)

                                }

                            </span>

                        </div>

                        <div className="detail-item">

                            <label>Usuario</label>

                            <span>

                                {detalle.usuarioId}

                            </span>

                        </div>

                        <div className="detail-item">

                            <label>Fecha</label>

                            <span>

                                {

                                    new Date(detalle.fecha)

                                        .toLocaleString()

                                }

                            </span>

                        </div>

                    </div>

                </div>

                <div className="modal-footer">

                    <button

                        className="secondary-button"

                        onClick={onClose}

                    >

                        Cerrar

                    </button>

                </div>

            </div>

        </div>

    );

}