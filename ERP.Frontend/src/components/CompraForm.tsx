import React, { useState } from "react";
import { guardarCompra } from "../api/compras";
import { CompraDetalle } from "../types/compra";

import {
  Box,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Divider
} from "@mui/material";

export default function RegistrarCompra() {

  // CABECERA
  const [proveedorId, setProveedorId] = useState(0);
  const [serie, setSerie] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [observacion, setObservacion] = useState("");

  // PRODUCTO TEMPORAL
  const [productoId, setProductoId] = useState(0);
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [descuento, setDescuento] = useState(0);

  // DETALLE
  const [detalles, setDetalles] = useState<CompraDetalle[]>([]);

  const agregarProducto = () => {

    if (productoId === 0) {
      alert("Seleccione un producto");
      return;
    }

    const total =
      cantidad * precioUnitario - descuento;

    const nuevoDetalle: CompraDetalle = {
      productoId,
      codigo: "",
      descripcion,
      cantidad,
      precioUnitario,
      descuento,
      total
    };

    setDetalles(prev => [...prev, nuevoDetalle]);

    // LIMPIAR
    setProductoId(0);
    setDescripcion("");
    setCantidad(1);
    setPrecioUnitario(0);
    setDescuento(0);
  };

  const eliminarProducto = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  // TOTALES
  const subTotal = detalles.reduce(
    (acc, item) => acc + item.total,
    0
  );

  const igv = Number(
    (subTotal * 0.18).toFixed(2)
  );

  const total = Number(
    (subTotal + igv).toFixed(2)
  );

  const registrarCompra = async () => {

    if (proveedorId === 0) {
      alert("Seleccione proveedor");
      return;
    }

    if (detalles.length === 0) {
      alert("Debe agregar productos");
      return;
    }

    const compra = {
      proveedorId,
      usuarioId: 1,
      fecha: new Date().toISOString(),
      tipoDocumento: "FACTURA",
      serie,
      numeroDocumento,
      observacion,

      subTotal,
      igv,
      total,

      detalles: detalles.map(d => ({
        productoId: d.productoId,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        descuento: d.descuento
      }))
    };

    try {

      console.log("JSON enviado");
      console.log(compra);

      const respuesta =
        await guardarCompra(compra as any);

      alert("Compra registrada correctamente");

      console.log(respuesta);

      // LIMPIAR FORMULARIO

      setProveedorId(0);
      setSerie("");
      setNumeroDocumento("");
      setObservacion("");
      setDetalles([]);

    } catch (error) {

      console.error(error);

      alert("Error al registrar compra");
    }
  };

  return (
    <Box component={Paper} p={3}>

      <Typography variant="h5" gutterBottom>
        Registrar Compra
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* CABECERA */}

      <Grid container spacing={2}>

        <Grid item xs={12} md={4}>
          <TextField
            label="Proveedor Id"
            fullWidth
            type="number"
            value={proveedorId}
            onChange={(e) =>
              setProveedorId(Number(e.target.value))
            }
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            label="Serie"
            fullWidth
            value={serie}
            onChange={(e) =>
              setSerie(e.target.value)
            }
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            label="Número Documento"
            fullWidth
            value={numeroDocumento}
            onChange={(e) =>
              setNumeroDocumento(e.target.value)
            }
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Observación"
            fullWidth
            multiline
            rows={2}
            value={observacion}
            onChange={(e) =>
              setObservacion(e.target.value)
            }
          />
        </Grid>

      </Grid>

      <Divider sx={{ mt: 3, mb: 3 }} />

      {/* PRODUCTO */}

      <Typography variant="h6">
        Agregar Producto
      </Typography>

      <Grid container spacing={2} mt={1}>

        <Grid item xs={12} md={2}>
          <TextField
            label="Producto Id"
            fullWidth
            type="number"
            value={productoId}
            onChange={(e) =>
              setProductoId(Number(e.target.value))
            }
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <TextField
            label="Descripción"
            fullWidth
            value={descripcion}
            onChange={(e) =>
              setDescripcion(e.target.value)
            }
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <TextField
            label="Cantidad"
            fullWidth
            type="number"
            value={cantidad}
            onChange={(e) =>
              setCantidad(Number(e.target.value))
            }
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <TextField
            label="Precio"
            fullWidth
            type="number"
            value={precioUnitario}
            onChange={(e) =>
              setPrecioUnitario(Number(e.target.value))
            }
          />
        </Grid>

        <Grid item xs={12} md={2}>
          <TextField
            label="Descuento"
            fullWidth
            type="number"
            value={descuento}
            onChange={(e) =>
              setDescuento(Number(e.target.value))
            }
          />
        </Grid>

        <Grid item xs={12} md={1}>
          <Button
            variant="contained"
            color="success"
            fullWidth
            sx={{ height: "56px" }}
            onClick={agregarProducto}
          >
            +
          </Button>
        </Grid>

      </Grid>

      {/* TABLA */}

      <Box mt={4}>

        <Typography variant="h6">
          Detalle Compra
        </Typography>

        <Table>

          <TableHead>

            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Cantidad</TableCell>
              <TableCell>Precio</TableCell>
              <TableCell>Descuento</TableCell>
              <TableCell>Total</TableCell>
              <TableCell></TableCell>
            </TableRow>

          </TableHead>

          <TableBody>

            {detalles.map((item, index) => (

              <TableRow key={index}>

                <TableCell>
                  {item.productoId}
                </TableCell>

                <TableCell>
                  {item.descripcion}
                </TableCell>

                <TableCell>
                  {item.cantidad}
                </TableCell>

                <TableCell>
                  S/ {item.precioUnitario.toFixed(2)}
                </TableCell>

                <TableCell>
                  S/ {item.descuento.toFixed(2)}
                </TableCell>

                <TableCell>
                  S/ {item.total.toFixed(2)}
                </TableCell>

                <TableCell>

                  <Button
                    color="error"
                    onClick={() =>
                      eliminarProducto(index)
                    }
                  >
                    Eliminar
                  </Button>

                </TableCell>

              </TableRow>

            ))}

          </TableBody>

        </Table>

      </Box>

      {/* TOTALES */}

      <Box
        mt={4}
        display="flex"
        flexDirection="column"
        alignItems="flex-end"
        gap={1}
      >
        <Typography>
          SubTotal: S/ {subTotal.toFixed(2)}
        </Typography>

        <Typography>
          IGV: S/ {igv.toFixed(2)}
        </Typography>

        <Typography variant="h6">
          Total: S/ {total.toFixed(2)}
        </Typography>
      </Box>

      {/* GUARDAR */}

      <Box mt={4}>

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={registrarCompra}
        >
          Registrar Compra
        </Button>

      </Box>

    </Box>
  );
}