import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from "@mui/material";
import axios from "axios";
import { apiUrl } from '../config/api';
import { CompraDetalle } from "../types/compra";

interface Producto {
  id: number;
  codigo: string;
  descripcion: string;
  precioUnitario: number;
}

const TablaProducto: React.FC<{
  productos: CompraDetalle[];
  onChange: (productos: CompraDetalle[]) => void;
}> = ({ productos, onChange }) => {
  const [listaProductos, setListaProductos] = useState<Producto[]>([]);

  useEffect(() => {
    axios.get(apiUrl('/productos'))
      .then(res => setListaProductos(res.data));
  }, []);

  const seleccionarProducto = (index: number, producto: Producto) => {
    const nuevos = [...productos];
    nuevos[index].codigo = producto.codigo;
    nuevos[index].descripcion = producto.descripcion;
    nuevos[index].precioUnitario = producto.precioUnitario;
    nuevos[index].total = nuevos[index].cantidad * producto.precioUnitario;
    onChange(nuevos);
  };

  const actualizarCantidad = (index: number, cantidad: number) => {
    const nuevos = [...productos];
    nuevos[index].cantidad = cantidad;
    nuevos[index].total = cantidad * nuevos[index].precioUnitario;
    onChange(nuevos);
  };

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>CÓDIGO</TableCell>
          <TableCell>DESCRIPCIÓN</TableCell>
          <TableCell>CANTIDAD</TableCell>
          <TableCell>PRECIO</TableCell>
          <TableCell>DSCTO</TableCell>
          <TableCell>TOTAL</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {productos.map((p, i) => (
          <TableRow key={i}>
            <TableCell>
              <Autocomplete
                options={listaProductos}
                getOptionLabel={(prod) => prod.codigo}
                onChange={(e, value) => value && seleccionarProducto(i, value)}
                renderInput={(params) => <TextField {...params} label="Código" />}
              />
            </TableCell>
            <TableCell>
              <Autocomplete
                options={listaProductos}
                getOptionLabel={(prod) => prod.descripcion}
                onChange={(e, value) => value && seleccionarProducto(i, value)}
                renderInput={(params) => <TextField {...params} label="Descripción" />}
              />
            </TableCell>
            <TableCell>
              <TextField
                type="number"
                value={p.cantidad}
                onChange={(e) => actualizarCantidad(i, Number(e.target.value))}
              />
            </TableCell>
            <TableCell>{p.precioUnitario?.toFixed(2)?? "0.00"}</TableCell>
            <TableCell>{p.descuento.toFixed(2)}</TableCell>
            <TableCell>{p.total.toFixed(2)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TablaProducto;
