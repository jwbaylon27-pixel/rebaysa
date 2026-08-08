import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Collapse,
  TextField,
  MenuItem,
  Button
} from "@mui/material";
import Grid from "@mui/material/Grid"; // ✅ Usamos Grid correcto en MUI v9
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import axios from "axios";
import { apiUrl } from '../config/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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
  socio: string;
  subTotal: number;
  igv: number;
  total: number;
  estado: string;
  detalles: MovimientoDetalle[];
};

export default function Dashboard() {
  const [movimientos, setMovimientos] = useState<MovimientoComercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRows, setOpenRows] = useState<{ [key: number]: boolean }>({});
  const [tipoFiltro, setTipoFiltro] = useState<string>("Todos");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");

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

  if (loading) return <CircularProgress />;

  // Filtrado
  const movimientosFiltrados = movimientos.filter(m => {
    const fechaMov = new Date(m.fecha);
    const cumpleFecha =
      (!fechaInicio || fechaMov >= new Date(fechaInicio)) &&
      (!fechaFin || fechaMov <= new Date(fechaFin));

    const cumpleTipo =
      tipoFiltro === "Todos" ||
      (tipoFiltro === "Compras" && m.estado === "REGISTRADO" && m.total < 0) ||
      (tipoFiltro === "Ventas" && m.estado === "REGISTRADO" && m.total >= 0);

    return cumpleFecha && cumpleTipo;
  });

  // Datos para gráficos
  const dataLine = movimientosFiltrados.map(m => ({
    fecha: new Date(m.fecha).toLocaleDateString(),
    total: m.total
  }));

  const dataBar = [
    { name: "Compras", value: movimientosFiltrados.filter(m => m.total < 0).reduce((acc, m) => acc + m.total, 0) },
    { name: "Ventas", value: movimientosFiltrados.filter(m => m.total >= 0).reduce((acc, m) => acc + m.total, 0) }
  ];

  const dataPie = [
    { name: "IGV", value: movimientosFiltrados.reduce((acc, m) => acc + m.igv, 0) },
    { name: "SubTotal", value: movimientosFiltrados.reduce((acc, m) => acc + m.subTotal, 0) }
  ];

  const COLORS = ["#0088FE", "#FF8042"];

  const toggleRow = (id: number) => {
    setOpenRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Exportar a Excel
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      movimientosFiltrados.map(m => ({
        ID: m.id,
        Fecha: new Date(m.fecha).toLocaleDateString(),
        Socio: m.socio,
        Estado: m.estado,
        SubTotal: m.subTotal,
        IGV: m.igv,
        Total: m.total
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "Movimientos.xlsx");
  };

  // Exportar a CSV
  const exportarCSV = () => {
    const ws = XLSX.utils.json_to_sheet(
      movimientosFiltrados.map(m => ({
        ID: m.id,
        Fecha: new Date(m.fecha).toLocaleDateString(),
        Socio: m.socio,
        Estado: m.estado,
        SubTotal: m.subTotal,
        IGV: m.igv,
        Total: m.total
      }))
    );
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "Movimientos.csv");
  };

  return (
   <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Dashboard Comercial
      </Typography>

      {/* Filtros */}
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <TextField
          label="Fecha Inicio"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={fechaInicio}
          onChange={e => setFechaInicio(e.target.value)}
        />
        <TextField
          label="Fecha Fin"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={fechaFin}
          onChange={e => setFechaFin(e.target.value)}
        />
        <TextField
          select
          label="Tipo"
          value={tipoFiltro}
          onChange={e => setTipoFiltro(e.target.value)}
        >
          <MenuItem value="Todos">Todos</MenuItem>
          <MenuItem value="Compras">Compras</MenuItem>
          <MenuItem value="Ventas">Ventas</MenuItem>
        </TextField>
        <Button variant="contained" color="primary" onClick={exportarExcel}>
          Exportar Excel
        </Button>
        <Button variant="outlined" color="secondary" onClick={exportarCSV}>
          Exportar CSV
        </Button>
      </Box>

      {/* Gráficos */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6">Evolución de Totales</Typography>
          <LineChart width={500} height={300} data={dataLine}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#8884d8" />
          </LineChart>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6">Compras vs Ventas</Typography>
          <BarChart width={500} height={300} data={dataBar}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#82ca9d" />
          </BarChart>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6">Distribución SubTotal vs IGV</Typography>
          <PieChart width={400} height={300}>
        <Pie
          data={dataPie}
          cx={200}
          cy={150}
          labelLine={false}
          label={({ name, percent }) =>
            `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
          }
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {dataPie.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>

            <Tooltip />
          </PieChart>
        </Grid>
      </Grid>

      {/* Tabla expandible */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Detalle de Movimientos</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
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
              <React.Fragment key={m.id}>
                <TableRow>
                  <TableCell>
                    <IconButton size="small" onClick={() => toggleRow(m.id)}>
                      {openRows[m.id] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                  </TableCell>
                  <TableCell>{m.id}</TableCell>
                  <TableCell>{new Date(m.fecha).toLocaleDateString()}</TableCell>
                  <TableCell>{m.socio}</TableCell>
                  <TableCell>{m.estado}</TableCell>
                  <TableCell>S/ {m.subTotal.toFixed(2)}</TableCell>
                  <TableCell>S/ {m.igv.toFixed(2)}</TableCell>
                  <TableCell>S/ {m.total.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={8} style={{ paddingBottom: 0, paddingTop: 0 }}>
                    <Collapse in={openRows[m.id]} timeout="auto" unmountOnExit>
                      <Box margin={1}>
                        <Typography variant="subtitle1">Productos</Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Producto</TableCell>
                              <TableCell>Cantidad</TableCell>
                              <TableCell>Precio Unitario</TableCell>
                              <TableCell>Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {m.detalles.map(d => (
                              <TableRow key={d.id}>
                                <TableCell>{d.producto}</TableCell>
                                <TableCell>{d.cantidad}</TableCell>
                                <TableCell>S/ {d.precioUnitario.toFixed(2)}</TableCell>
                                <TableCell>S/ {d.total.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper> 
  );
}
