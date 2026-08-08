import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { buscarProductos } from "../../services/kardexService";

export interface ProductoBusqueda {
    id: number;
    codigo: string;
    descripcion: string;
    stock: number;
    stockMinimo: number;
}

interface Props {
    value: ProductoBusqueda | null;
    onChange: (producto: ProductoBusqueda | null) => void;
}

export default function AutocompleteProducto({ value, onChange }: Props) {
    const [texto, setTexto] = useState("");
    const [productos, setProductos] = useState<ProductoBusqueda[]>([]);
    const [mostrarLista, setMostrarLista] = useState(false);
    const [cargando, setCargando] = useState(false);
    const contenedorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (texto.trim().length < 2) {
            setProductos([]);
            return;
        }

        let cancelado = false;
        setCargando(true);

        const timeout = setTimeout(async () => {
            try {
                const lista = await buscarProductos(texto);
                if (!cancelado) setProductos(lista);
            } catch (error) {
                console.error(error);
            } finally {
                if (!cancelado) setCargando(false);
            }
        }, 250);

        return () => {
            cancelado = true;
            clearTimeout(timeout);
        };
    }, [texto]);

    useEffect(() => {
        function alClickFuera(e: MouseEvent) {
            if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
                setMostrarLista(false);
            }
        }
        document.addEventListener("mousedown", alClickFuera);
        return () => document.removeEventListener("mousedown", alClickFuera);
    }, []);

    return (
        <div className="kx-autocomplete" ref={contenedorRef}>
            <div className="kx-autocomplete-input-wrap">
                <Search size={17} />
                <input
                    type="text"
                    placeholder="Buscar producto por código o descripción..."
                    value={value ? `${value.codigo} — ${value.descripcion}` : texto}
                    onChange={(e) => {
                        setTexto(e.target.value);
                        onChange(null);
                        setMostrarLista(true);
                    }}
                    onFocus={() => setMostrarLista(true)}
                />
                {cargando && (
                    <Loader2
                        size={16}
                        className="kx-spin"
                        style={{ position: "absolute", right: 14, color: "var(--kx-muted)" }}
                    />
                )}
            </div>

            {mostrarLista && texto.trim().length >= 2 && (
                <div className="kx-autocomplete-list">
                    {productos.length === 0 && !cargando && (
                        <div className="kx-autocomplete-empty">
                            No se encontraron productos para "{texto}"
                        </div>
                    )}

                    {productos.map((p) => (
                        <div
                            key={p.id}
                            className="kx-autocomplete-item"
                            onClick={() => {
                                onChange(p);
                                setTexto("");
                                setMostrarLista(false);
                            }}
                        >
                            <span className="kx-code">{p.codigo}</span>
                            <span className="kx-name">{p.descripcion}</span>
                            {p.stock <= p.stockMinimo && (
                                <span className="badge badge-red">Stock bajo</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
