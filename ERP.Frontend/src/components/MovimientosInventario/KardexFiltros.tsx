import { Calendar, Filter } from "lucide-react";
import { KardexFiltro } from "../../types/kardex";

interface Almacen {
    id: number;
    nombre: string;
}

interface TipoMovimiento {
    nombre: string;
}

interface Props {
    filtro: KardexFiltro;
    setFiltro: React.Dispatch<React.SetStateAction<KardexFiltro>>;

    almacenes: Almacen[];
    almacenId: number;
    setAlmacenId: (id: number) => void;

    tiposMovimiento: TipoMovimiento[];
}

export default function KardexFiltros({
    filtro,
    setFiltro,
    almacenes,
    almacenId,
    setAlmacenId,
    tiposMovimiento
}: Props) {

    return (

        <div className="kardex-filtros">

            <div className="filtro-titulo">

                <Filter size={18} />

                <span>Filtros</span>

            </div>

            <div className="filtro-grid">

                {/* Almacén */}

                <div className="campo">

                    <label>Almacén</label>

                    <select
                        value={almacenId}
                        onChange={(e) =>
                            setAlmacenId(Number(e.target.value))
                        }
                    >
                        {
                            almacenes.map(a => (
                                <option
                                    key={a.id}
                                    value={a.id}
                                >
                                    {a.nombre}
                                </option>
                            ))
                        }
                    </select>

                </div>

                {/* Tipo */}

                <div className="campo">

                    <label>Movimiento</label>

                    <select
                        value={filtro.tipoMovimiento}
                        onChange={(e) =>
                            setFiltro({
                                ...filtro,
                                tipoMovimiento: e.target.value
                            })
                        }
                    >

                        <option value="">
                            Todos
                        </option>

                        {
                            tiposMovimiento.map(t => (

                                <option
                                    key={t.nombre}
                                    value={t.nombre}
                                >
                                    {t.nombre}
                                </option>

                            ))
                        }

                    </select>

                </div>

                {/* Fecha Inicio */}

                <div className="campo">

                    <label>

                        <Calendar size={16} />

                        Desde

                    </label>

                    <input
                        type="date"
                        value={filtro.fechaInicio}
                        onChange={(e) =>
                            setFiltro({
                                ...filtro,
                                fechaInicio: e.target.value
                            })
                        }
                    />

                </div>

                {/* Fecha Fin */}

                <div className="campo">

                    <label>

                        <Calendar size={16} />

                        Hasta

                    </label>

                    <input
                        type="date"
                        value={filtro.fechaFin}
                        onChange={(e) =>
                            setFiltro({
                                ...filtro,
                                fechaFin: e.target.value
                            })
                        }
                    />

                </div>

            </div>

        </div>

    );

}