import { useEffect, useRef, useState } from "react";
import { Search, Package } from "lucide-react";

interface ProductoBusqueda {

    id: number;

    codigo: string;

    descripcion: string;

    stock: number;

    stockMinimo: number;

}

interface Props {

    value: ProductoBusqueda | null;

    onChange: (producto: ProductoBusqueda | null) => void;

    onSearch: (
        texto: string
    ) => Promise<ProductoBusqueda[]>;

}

export default function ProductoAutocomplete({

    value,

    onChange,

    onSearch

}: Props) {

    const [texto, setTexto] =
        useState("");

    const [lista, setLista] =
        useState<ProductoBusqueda[]>([]);

    const [mostrarLista, setMostrarLista] =
        useState(false);

    const ref =
        useRef<HTMLDivElement>(null);

    //------------------------------------------------

    useEffect(() => {

        if (value) {

            setTexto(

                `${value.codigo} - ${value.descripcion}`

            );

        }

    }, [value]);

    //------------------------------------------------

    useEffect(() => {

        const cerrar = (e: MouseEvent) => {

            if (

                ref.current &&

                !ref.current.contains(
                    e.target as Node
                )

            ) {

                setMostrarLista(false);

            }

        };

        document.addEventListener(

            "mousedown",

            cerrar

        );

        return () =>

            document.removeEventListener(

                "mousedown",

                cerrar

            );

    }, []);

    //------------------------------------------------

    async function buscar(
        valor: string
    ) {

        setTexto(valor);

        if (valor.length < 2) {

            setLista([]);

            return;

        }

        try {

            const productos =

                await onSearch(valor);

            setLista(productos);

            setMostrarLista(true);

        }

        catch (e) {

            console.error(e);

        }

    }

    //------------------------------------------------

    function seleccionar(
        producto: ProductoBusqueda
    ) {

        onChange(producto);

        setTexto(

            `${producto.codigo} - ${producto.descripcion}`

        );

        setMostrarLista(false);

    }

    //------------------------------------------------

    return (

        <div

            className="producto-autocomplete"

            ref={ref}

        >

            <label>

                Producto

            </label>

            <div className="autocomplete-input">

                <Search size={18} />

                <input

                    type="text"

                    placeholder="Buscar producto..."

                    value={texto}

                    onChange={(e) =>

                        buscar(e.target.value)

                    }

                />

            </div>

            {

                mostrarLista &&

                lista.length > 0 &&

                <div className="autocomplete-list">

                    {

                        lista.map(item => (

                            <div

                                key={item.id}

                                className="autocomplete-item"

                                onClick={() =>

                                    seleccionar(item)

                                }

                            >

                                <Package size={18} />

                                <div>

                                    <strong>

                                        {item.codigo}

                                    </strong>

                                    <div>

                                        {item.descripcion}

                                    </div>

                                    <small>

                                        Stock:

                                        {" "}

                                        {item.stock}

                                    </small>

                                </div>

                            </div>

                        ))

                    }

                </div>

            }

        </div>

    );

}