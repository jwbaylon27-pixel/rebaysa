
import { useState } from "react";
import { Search, LoaderCircle } from "lucide-react";
import { consultarRuc, type RucConsulta } from "../api/sunat";

interface Props {
  onResultado: (datos: RucConsulta) => void;
}

export default function ConsultaRuc({ onResultado }: Props) {
  const [ruc, setRuc] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function buscar() {
    setError("");

    if (!/^\d{11}$/.test(ruc)) {
      setError("Ingresa los 11 dígitos del RUC.");
      return;
    }

    setCargando(true);

    try {
      const datos = await consultarRuc(ruc);
      onResultado(datos);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Error al consultar el RUC."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="consulta-ruc">
      <label htmlFor="ruc-sunat">RUC del contribuyente</label>

      <div className="consulta-ruc-row">
        <input
          id="ruc-sunat"
          type="text"
          inputMode="numeric"
          maxLength={11}
          placeholder="Ej. 20123456789"
          value={ruc}
          onChange={(e) =>
            setRuc(e.target.value.replace(/\D/g, "").slice(0, 11))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void buscar();
            }
          }}
        />

        <button
          type="button"
          className="primary-button"
          onClick={() => void buscar()}
          disabled={cargando || ruc.length !== 11}
        >
          {cargando ? (
            <LoaderCircle size={17} />
          ) : (
            <Search size={17} />
          )}
          {cargando ? "Consultando..." : "Consultar SUNAT"}
        </button>
      </div>

      {error && <p className="consulta-ruc-error">{error}</p>}
    </div>
  );
}
