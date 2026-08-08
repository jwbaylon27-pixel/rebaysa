import {
    Boxes,
    DollarSign,
    Package,
    TrendingDown,
    TrendingUp
} from "lucide-react";

import { KardexResumen } from "../../types/kardex";

interface Props {
    resumen: KardexResumen;
}

function moneda(valor: number) {
    return valor.toLocaleString("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

export default function KardexResumenCard({
    resumen
}: Props) {

    return (

        <div className="kardex-resumen">

            {/* Stock */}

            <div className="resumen-card stock">

                <div className="resumen-icon">

                    <Package size={30} />

                </div>

                <div>

                    <span>Stock Actual</span>

                    <h2>

                        {resumen.stockActual}

                    </h2>

                </div>

            </div>

            {/* Costo */}

            <div className="resumen-card costo">

                <div className="resumen-icon">

                    <DollarSign size={30} />

                </div>

                <div>

                    <span>Costo Promedio</span>

                    <h2>

                        S/ {moneda(resumen.costoPromedio)}

                    </h2>

                </div>

            </div>

            {/* Valor */}

            <div className="resumen-card valor">

                <div className="resumen-icon">

                    <Boxes size={30} />

                </div>

                <div>

                    <span>Valor Inventario</span>

                    <h2>

                        S/ {moneda(resumen.valorInventario)}

                    </h2>

                </div>

            </div>

            {/* Entradas */}

            <div className="resumen-card entradas">

                <div className="resumen-icon">

                    <TrendingUp size={30} />

                </div>

                <div>

                    <span>Entradas</span>

                    <h2>

                        {resumen.entradas}

                    </h2>

                </div>

            </div>

            {/* Salidas */}

            <div className="resumen-card salidas">

                <div className="resumen-icon">

                    <TrendingDown size={30} />

                </div>

                <div>

                    <span>Salidas</span>

                    <h2>

                        {resumen.salidas}

                    </h2>

                </div>

            </div>

        </div>

    );

}