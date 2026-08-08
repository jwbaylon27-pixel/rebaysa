import React, { useEffect, useState } from "react";
import { listarSociosNegocio } from "../api/sociosNegocio";
import { SocioNegocio } from "../types/socioNegocio";

export default function Proveedores() {
  const [proveedores, setProveedores] = useState<SocioNegocio[]>([]);

  useEffect(() => {
    const cargar = async () => {
      const data = await listarSociosNegocio();
      // 🔹 Filtrar solo tipo P (Proveedores)
      setProveedores(data.filter((s: SocioNegocio) => s.tipoSocio === "P"));
    };
    cargar();
  }, []);

  return (
    <div>
      <h2>Proveedores</h2>
      <table className="table table-hover">
        <thead className="table-dark">
          <tr>
            <th>ID</th>
            <th>Nombres</th>
            <th>Documento</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {proveedores.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.nombres}</td>
              <td>{p.numeroDocumento}</td>
              <td>{p.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}