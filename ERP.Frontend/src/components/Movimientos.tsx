import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress
} from "@mui/material";
import axios from "axios";
import { apiUrl } from '../config/api';

type MovimientoDetalle = {
  id: number;
  productoId: number;
  producto: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
};

type MovimientoComercial = {
  id: number;
  fecha: string;
  socioId: number;
  socio: string;
  detalles: MovimientoDetalle[];
  subTotal: number;
  igv: number;
  total: number;
  estado: string;
};

export default function Movimientos() {
  const [movimientos, setMovimientos] = useState<MovimientoComercial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovimientos = async () => {
      try {
        const { data } = await axios.get<MovimientoComercial[]>(apiUrl('/Dashboard'));
        setMovimientos(data);
      } catch (error) {
        console.error(error);
        alert("Error al cargar movimientos");
      } finally {
        setLoading(false);
      }
    };
    fetchMovimientos();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box component={Paper} p={3}>
      <Typography variant="h5" gutterBottom>
        Movimientos Comerciales (Compras y Ventas)
      </Typography>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Fecha</TableCell>
            <TableCell>Socio</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell>SubTotal</TableCell>
            <TableCell>IGV</TableCell>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {movimientos.map(m => (
            <TableRow key={m.id}>
              <TableCell>{m.id}</TableCell>
              <TableCell>{new Date(m.fecha).toLocaleDateString()}</TableCell>
              <TableCell>{m.socio}</TableCell>
              <TableCell>{m.estado}</TableCell>
              <TableCell>S/ {m.subTotal.toFixed(2)}</TableCell>
              <TableCell>S/ {m.igv.toFixed(2)}</TableCell>
              <TableCell>S/ {m.total.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
