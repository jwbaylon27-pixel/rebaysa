import React, { useEffect, useMemo, useState } from "react";
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
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Alert,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  TrendingUp,
  AccountBalanceWallet,
  ShoppingCart,
  EmojiEvents,
  Inventory2,
  ReceiptLong,
  PointOfSale,
} from "@mui/icons-material";
import axios from "axios";
import { apiUrl } from "../config/api";
import { listarSociosNegocio } from "../api/sociosNegocio";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
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
  socioId: number;
  socio: string;
  subTotal: number;
  igv: number;
  total: number;
  estado: string;
  tipo: "compra" | "venta";
  metodoPago: string | null;
  detalles: MovimientoDetalle[];
};

function formatoMoneda(valor: number) {
  return valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------- Tarjeta de KPI ----------
function KpiCard({
  icono,
  etiqueta,
  valor,
  color,
  nota,
  prefijo = "S/ ",
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string;
  color: string;
  nota?: string;
  prefijo?: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, display: "flex", alignItems: "center", gap: 2, height: "100%" }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: `${color}1a`,
          color,
          flexShrink: 0,
        }}
      >
        {icono}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 600 }}>
          {etiqueta}
        </Typography>
        <Typography variant="h5" fontFamily="monospace" fontWeight={700} noWrap>
          {prefijo}{valor}
        </Typography>
        {nota && (
          <Typography variant="caption" color="text.secondary">
            {nota}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

// ---------- Ranking Top 5 ----------
function TopRanking({
  titulo,
  icono,
  filas,
}: {
  titulo: string;
  icono: React.ReactNode;
  filas: { nombre: string; valor: string; sub?: string }[];
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        {icono}
        <Typography variant="subtitle1" fontWeight={700}>
          {titulo}
        </Typography>
      </Box>
      {filas.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Sin datos suficientes todavía.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {filas.map((f, i) => (
            <Box
              key={f.nombre + i}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                py: 0.75,
                borderBottom: i < filas.length - 1 ? "1px solid" : "none",
                borderColor: "divider",
              }}
            >
              <Chip
                label={i + 1}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: i === 0 ? "#fde68a" : "action.hover",
                  minWidth: 26,
                }}
              />
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                {f.nombre}
              </Typography>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                  {f.valor}
                </Typography>
                {f.sub && (
                  <Typography variant="caption" color="text.secondary">
                    {f.sub}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}

export default function Dashboard() {
  const [movimientos, setMovimientos] = useState<MovimientoComercial[]>([]);
  const [totalXCobrar, setTotalXCobrar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openRows, setOpenRows] = useState<{ [key: number]: boolean }>({});
  const [tipoFiltro, setTipoFiltro] = useState<string>("Todos");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [criterioTop, setCriterioTop] = useState<"ingresos" | "cantidad">("ingresos");

  useEffect(() => {
    const fetchMovimientos = async () => {
      try {
        const [{ data: movs }, socios] = await Promise.all([
          axios.get<MovimientoComercial[]>(apiUrl("/Dashboard")),
          listarSociosNegocio(),
        ]);
        setMovimientos(movs);
        // Total x Cobrar = suma del saldo pendiente de los clientes
        // (SocioNegocio.Saldo, que se acumula en sp_RegistrarVenta
        // cuando la venta es al crédito — ver sp_RegistrarVenta_patch.txt)
        const cobrar = socios
          .filter((s: any) => s.tipoSocio === "C" && (s.saldo ?? 0) > 0)
          .reduce((acc: number, s: any) => acc + (s.saldo ?? 0), 0);
        setTotalXCobrar(cobrar);
      } catch (error) {
        console.error(error);
        setError("No se pudieron cargar los indicadores. Verifica la conexión con el servidor e intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };
    fetchMovimientos();
  }, []);

  // Filtrado por fecha y tipo (ya no depende del signo de total, usa el campo real)
  const movimientosFiltrados = movimientos.filter((m) => {
    const fechaMov = new Date(m.fecha);
    const cumpleFecha =
      (!fechaInicio || fechaMov >= new Date(fechaInicio)) &&
      (!fechaFin || fechaMov <= new Date(fechaFin));

    const cumpleTipo =
      tipoFiltro === "Todos" ||
      (tipoFiltro === "Compras" && m.tipo === "compra") ||
      (tipoFiltro === "Ventas" && m.tipo === "venta");

    return cumpleFecha && cumpleTipo;
  });

  const ventasRegistradas = movimientosFiltrados.filter(
    (m) => m.tipo === "venta" && m.estado === "REGISTRADO"
  );
  const comprasRegistradas = movimientosFiltrados.filter(
    (m) => m.tipo === "compra" && m.estado === "REGISTRADO"
  );

  // ---------- KPIs ----------
  const ingresosTotales = useMemo(
    () => ventasRegistradas.reduce((acc, m) => acc + m.total, 0),
    [ventasRegistradas]
  );

  // totalXCobrar viene de SocioNegocio.Saldo (ver useEffect), no se
  // recalcula aquí — así refleja el saldo acumulado real, no solo
  // las ventas a crédito filtradas por fecha en pantalla.

  const comprasTotales = useMemo(
    () => comprasRegistradas.reduce((acc, m) => acc + m.total, 0),
    [comprasRegistradas]
  );

  const unidadesVendidas = useMemo(
    () => ventasRegistradas.reduce((acumulado, movimiento) => acumulado + movimiento.detalles.reduce((cantidad, detalle) => cantidad + detalle.cantidad, 0), 0),
    [ventasRegistradas],
  );
  const ticketPromedio = ventasRegistradas.length ? ingresosTotales / ventasRegistradas.length : 0;
  const documentosProcesados = ventasRegistradas.length + comprasRegistradas.length;

  // ---------- Top 5 clientes (por ingresos) ----------
  const topClientes = useMemo(() => {
    const mapa = new Map<string, number>();
    ventasRegistradas.forEach((m) => {
      mapa.set(m.socio || "Sin nombre", (mapa.get(m.socio || "Sin nombre") ?? 0) + m.total);
    });
    return Array.from(mapa.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, total]) => ({ nombre, valor: `S/ ${formatoMoneda(total)}` }));
  }, [ventasRegistradas]);

  // ---------- Top 5 productos (cantidad o ingresos, solo ventas) ----------
  const topProductos = useMemo(() => {
    const mapa = new Map<string, { cantidad: number; ingresos: number }>();
    ventasRegistradas.forEach((m) => {
      m.detalles.forEach((d) => {
        const actual = mapa.get(d.producto) ?? { cantidad: 0, ingresos: 0 };
        actual.cantidad += d.cantidad;
        actual.ingresos += d.total;
        mapa.set(d.producto, actual);
      });
    });
    return Array.from(mapa.entries())
      .sort((a, b) =>
        criterioTop === "ingresos" ? b[1].ingresos - a[1].ingresos : b[1].cantidad - a[1].cantidad
      )
      .slice(0, 5)
      .map(([nombre, v]) => ({
        nombre,
        valor: criterioTop === "ingresos" ? `S/ ${formatoMoneda(v.ingresos)}` : `${v.cantidad} und`,
        sub: criterioTop === "ingresos" ? `${v.cantidad} und vendidas` : `S/ ${formatoMoneda(v.ingresos)}`,
      }));
  }, [ventasRegistradas, criterioTop]);

  // Datos para gráficos (ya existentes)
  const dataLine = movimientosFiltrados.map((m) => ({
    fecha: new Date(m.fecha).toLocaleDateString(),
    total: m.tipo === "compra" ? -m.total : m.total,
  }));

  const dataBar = [
    { name: "Compras", value: comprasTotales },
    { name: "Ventas", value: ingresosTotales },
  ];

  const dataPie = [
    { name: "IGV", value: movimientosFiltrados.reduce((acc, m) => acc + m.igv, 0) },
    { name: "SubTotal", value: movimientosFiltrados.reduce((acc, m) => acc + m.subTotal, 0) },
  ];

  const COLORS = ["#0088FE", "#FF8042"];

  const toggleRow = (id: number) => {
    setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      movimientosFiltrados.map((m) => ({
        ID: m.id,
        Tipo: m.tipo,
        Fecha: new Date(m.fecha).toLocaleDateString(),
        Socio: m.socio,
        Estado: m.estado,
        MetodoPago: m.metodoPago ?? "",
        SubTotal: m.subTotal,
        IGV: m.igv,
        Total: m.total,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "Movimientos.xlsx");
  };

  const exportarCSV = () => {
    const ws = XLSX.utils.json_to_sheet(
      movimientosFiltrados.map((m) => ({
        ID: m.id,
        Tipo: m.tipo,
        Fecha: new Date(m.fecha).toLocaleDateString(),
        Socio: m.socio,
        Estado: m.estado,
        MetodoPago: m.metodoPago ?? "",
        SubTotal: m.subTotal,
        IGV: m.igv,
        Total: m.total,
      }))
    );
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "Movimientos.csv");
  };

  if (loading) return <Box sx={{ minHeight: 280, display: "grid", placeItems: "center" }} aria-label="Cargando dashboard"><CircularProgress /></Box>;

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Dashboard comercial</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Consulta ventas, compras, cobros y movimientos registrados.</Typography>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Filtros */}
      <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          label="Fecha Inicio"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
        />
        <TextField
          label="Fecha Fin"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
        />
        <TextField select label="Tipo" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
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

      {/* KPIs principales */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 2, mb: 3, width: "100%" }}>
        <Box>
          <KpiCard
            icono={<TrendingUp />}
            etiqueta="Ingresos Totales"
            valor={formatoMoneda(ingresosTotales)}
            color="#1e9d66"
            nota={`${ventasRegistradas.length} ventas registradas`}
          />
        </Box>
        <Box>
          <KpiCard
            icono={<AccountBalanceWallet />}
            etiqueta="Total x Cobrar"
            valor={formatoMoneda(totalXCobrar)}
            color="#d64545"
            nota="Ventas al crédito pendientes"
          />
        </Box>
        <Box>
          <KpiCard
            icono={<ShoppingCart />}
            etiqueta="Compras Totales"
            valor={formatoMoneda(comprasTotales)}
            color="#12333a"
            nota={`${comprasRegistradas.length} compras registradas`}
          />
        </Box>
        <Box>
          <KpiCard
            icono={<PointOfSale />}
            etiqueta="Ticket Promedio"
            valor={formatoMoneda(ticketPromedio)}
            color="#2563eb"
            nota="Promedio por venta registrada"
          />
        </Box>
        <Box>
          <KpiCard
            icono={<Inventory2 />}
            etiqueta="Unidades Vendidas"
            valor={unidadesVendidas.toLocaleString("es-PE")}
            color="#7c3aed"
            nota="Unidades en ventas registradas"
            prefijo=""
          />
        </Box>
        <Box>
          <KpiCard
            icono={<ReceiptLong />}
            etiqueta="Documentos Procesados"
            valor={documentosProcesados.toLocaleString("es-PE")}
            color="#d97706"
            nota={`${ventasRegistradas.length} ventas · ${comprasRegistradas.length} compras`}
            prefijo=""
          />
        </Box>
      </Box>

      {/* Top 5 */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, .85fr) minmax(0, 1.65fr)" }, gap: 3, mb: 3, width: "100%" }}>
        <Box>
          <TopRanking titulo="Top 5 Clientes" icono={<EmojiEvents sx={{ color: "#d97706" }} />} filas={topClientes} />
        </Box>
        <Box>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <EmojiEvents sx={{ color: "#d97706" }} />
                <Typography variant="subtitle1" fontWeight={700}>
                  Top 5 Productos
                </Typography>
              </Box>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={criterioTop}
                onChange={(_, v) => v && setCriterioTop(v)}
              >
                <ToggleButton value="ingresos">Por ingresos</ToggleButton>
                <ToggleButton value="cantidad">Por cantidad</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {topProductos.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Sin datos suficientes todavía.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {topProductos.map((f, i) => (
                  <Box
                    key={f.nombre + i}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      py: 0.75,
                      borderBottom: i < topProductos.length - 1 ? "1px solid" : "none",
                      borderColor: "divider",
                    }}
                  >
                    <Chip label={i + 1} size="small" sx={{ fontWeight: 700, bgcolor: i === 0 ? "#fde68a" : "action.hover", minWidth: 26 }} />
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                      {f.nombre}
                    </Typography>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                        {f.valor}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {f.sub}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 3, mt: 1 }}>
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
          <Typography variant="h6">Evolución de totales</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Compras y ventas registradas en el periodo seleccionado.</Typography>
          <Box sx={{ height: { xs: 300, md: 360 }, width: "100%" }}>
            <ResponsiveContainer>
              <LineChart data={dataLine} margin={{ top: 12, right: 24, left: 12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
                <XAxis dataKey="fecha" minTickGap={32} />
                <YAxis width={72} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" name="Total" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 3 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, minWidth: 0 }}>
            <Typography variant="h6">Compras vs ventas</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Comparativo acumulado del periodo.</Typography>
            <Box sx={{ height: 320, width: "100%" }}>
              <ResponsiveContainer>
                <BarChart data={dataBar} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
                  <XAxis dataKey="name" />
                  <YAxis width={68} />
                  <Tooltip />
                  <Bar dataKey="value" name="Total" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, minWidth: 0 }}>
            <Typography variant="h6">Distribución subtotal e IGV</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Composición de los movimientos del periodo.</Typography>
            <Box sx={{ height: 320, width: "100%" }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={dataPie}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={112}
                    dataKey="value"
                  >
                    {dataPie.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Tabla expandible */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6">Detalle de Movimientos</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>ID</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Socio</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>M. Pago</TableCell>
              <TableCell>SubTotal</TableCell>
              <TableCell>IGV</TableCell>
              <TableCell>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movimientosFiltrados.map((m) => (
              <React.Fragment key={`${m.tipo}-${m.id}`}>
                <TableRow>
                  <TableCell>
                    <IconButton size="small" onClick={() => toggleRow(m.id)}>
                      {openRows[m.id] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                  </TableCell>
                  <TableCell>{m.id}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={m.tipo === "venta" ? "Venta" : "Compra"}
                      color={m.tipo === "venta" ? "success" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{new Date(m.fecha).toLocaleDateString()}</TableCell>
                  <TableCell>{m.socio}</TableCell>
                  <TableCell>{m.estado}</TableCell>
                  <TableCell>{m.metodoPago ?? "—"}</TableCell>
                  <TableCell>S/ {m.subTotal.toFixed(2)}</TableCell>
                  <TableCell>S/ {m.igv.toFixed(2)}</TableCell>
                  <TableCell>S/ {m.total.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={10} style={{ paddingBottom: 0, paddingTop: 0 }}>
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
                            {m.detalles.map((d) => (
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
