import React, { useEffect, useState } from "react";
import { TextField, MenuItem } from "@mui/material";
import axios from "axios";
import { apiUrl } from '../config/api';

interface Proveedor {
  id: number;
  nombres: string;
  numeroDocumento: string;
}

const ProveedorSelect: React.FC<{ onChange: (id: number) => void }> = ({ onChange }) => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  useEffect(() => {
    axios.get(apiUrl('/SocioNegocio/proveedores'))
      .then(res => setProveedores(res.data));
  }, []);

  return (
    <TextField
      select
      label="Proveedor"
      fullWidth
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {proveedores.map((p) => (
        <MenuItem key={p.id} value={p.id}>
          {p.nombres} - {p.numeroDocumento}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default ProveedorSelect;  // 👈 Aquí está el export default
