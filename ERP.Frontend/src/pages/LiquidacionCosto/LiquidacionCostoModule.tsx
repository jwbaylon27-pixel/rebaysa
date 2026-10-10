import { useState } from 'react';
import LiquidacionCostoLista from './LiquidacionCostoLista';
import LiquidacionCostoCrear from './LiquidacionCostoCrear';
import LiquidacionCostoDetalle from './LiquidacionCostoDetalle';

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'crear' }
  | { tipo: 'detalle'; id: number };

/**
 * Punto de entrada del módulo de Liquidación de Costo. Maneja la navegación
 * interna entre lista / creación / detalle con estado local (mismo patrón que
 * usa Login con onAuthenticated: callbacks hacia el padre, sin router).
 * Móntalo donde ya montas el resto de módulos protegidos de la app.
 */
export default function LiquidacionCostoModule() {
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' });

  if (vista.tipo === 'crear') {
    return (
      <LiquidacionCostoCrear
        onCreada={(id) => setVista({ tipo: 'detalle', id })}
        onCancelar={() => setVista({ tipo: 'lista' })}
      />
    );
  }

  if (vista.tipo === 'detalle') {
    return (
      <LiquidacionCostoDetalle
        id={vista.id}
        onVolver={() => setVista({ tipo: 'lista' })}
      />
    );
  }

  return (
    <LiquidacionCostoLista
      onCrear={() => setVista({ tipo: 'crear' })}
      onVerDetalle={(id) => setVista({ tipo: 'detalle', id })}
    />
  );
}
