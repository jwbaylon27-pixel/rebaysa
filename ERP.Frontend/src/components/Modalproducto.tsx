import { useEffect, useState } from "react";
import axios from "axios";
import { apiUrl } from '../config/api';

interface Producto {
    id: number;
    codigo: string;
    descripcion: string;
    precioCompra: number;
    stock: number;
}
interface Props {
    open: boolean;
    onClose: () => void;
    onSelect: (producto: any) => void;
}
export default function ModalProducto({
    open,
    onClose,
    onSelect
}: Props) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [busqueda, setBusqueda] = useState("");
    useEffect(() => {
        if (open) {
            cargarProductos();
        }
    }, [open]);
    const cargarProductos = async () => {
        try {
            const response = await axios.get(apiUrl('/Productos'));
            setProductos(response.data);
        } catch (error) {
            console.error(error);
        }
    };
    const seleccionar = (producto: Producto) => {
        const cantidad =
            Number(
                prompt("Cantidad", "1")
            );
        if (!cantidad)
            return;
        const precio =
            Number(
                prompt(
                    "Precio Compra",
                    producto.precioCompra.toString()
                )
            );
        if (!precio)
            return;
        onSelect({
            productoId: producto.id,
            codigo: producto.codigo,
            descripcion: producto.descripcion,
            cantidad,
            precioUnitario: precio,
            descuento: 0,
            total: cantidad * precio
        });
        onClose();
    };
    const filtrados =
        productos.filter(x =>
            x.codigo
                .toLowerCase()
                .includes(busqueda.toLowerCase()) ||
            x.descripcion
                .toLowerCase()
                .includes(busqueda.toLowerCase())
        );
    if (!open)
        return null;
    return (
        <div
            className="modal d-block"
            style={{
                background:
                    "rgba(0,0,0,.5)"
            }}
        >
            <div className="modal-dialog modal-xl">
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h5>
                            Buscar Producto
                        </h5>
                        <button
                            className="btn-close"
                            onClick={onClose}
                        />
                    </div>
                    <div className="modal-body">
                        <input
                            className="form-control mb-3"
                            placeholder="Buscar producto..."
                            value={busqueda}
                            onChange={(e) =>
                                setBusqueda(
                                    e.target.value
                                )
                            }
                        />
                        <div
                            style={{
                                maxHeight:
                                    "450px",
                                overflowY:
                                    "auto"
                            }}
                        >
                            <table className="table table-hover">
                                <thead className="table-dark">
                                    <tr>
                                        <th>Código</th>
                                        <th>Descripción</th>
                                        <th>Stock</th>
                                        <th>Precio</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtrados.map(p => (
                                        <tr
                                            key={p.id}
                                        >
                                            <td>
                                                {p.codigo}
                                            </td>
                                            <td>
                                                {p.descripcion}
                                            </td>
                                            <td>
                                                {p.stock}
                                            </td>
                                            <td>
                                                S/
                                                {p.precioCompra}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-success btn-sm"
                                                    onClick={() =>
                                                        seleccionar(
                                                            p
                                                        )
                                                    }
                                                >
                                                    Seleccionar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
