import { useMemo, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Autocomplete,
  MenuItem,
  Grid,
  Divider,
  IconButton,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import {
  Add,
  Delete,
  Save,
  Person,
  Inventory2,
  PointOfSale,
  Payments,
  Event,
  Business,
  Badge,
  AttachMoney,
  Schedule,
  AssignmentInd,
} from "@mui/icons-material";
import axios from "axios";
import { apiUrl } from "../config/api";
import { obtenerSesion } from "../auth";
import { createFilterOptions } from "@mui/material/Autocomplete";

type Producto = {
  id: number;
  codigo: string; 
  nombre: string;
  precioCompra: number;
  precioVenta: number;
};

type SocioNegocio = {
  id: number;
  tipoSocio: string;
  tipoDocumento: string; // DNI / RUC
  numeroDocumento: string;
  nombres: string;
};

const filtroSocios = createFilterOptions<SocioNegocio>({
  stringify: (s) => `${s.numeroDocumento} ${s.nombres}`,
});

type VentaDetalle = {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  total: number;
};

interface Props {
  productos: Producto[];
  socios: SocioNegocio[];
}

const TIPOS_DOCUMENTO = ["BOLETA", "FACTURA", "NOTA DE CREDITO"];
const METODOS_PAGO = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "YAPE/PLIN", "CREDITO"];
const MONEDAS = [
  { codigo: "PEN", simbolo: "S/", etiqueta: "Soles (PEN)" },
  { codigo: "USD", simbolo: "$", etiqueta: "Dólares (USD)" },
];
const PLAZOS_CREDITO = [7, 15, 30];

function formatoMoneda(valor: number) {
  return valor.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function tipoClienteLabel(tipoDocumento: string) {
  const t = (tipoDocumento || "").toUpperCase();
  if (t === "RUC") return "Empresa (RUC)";
  if (t === "DNI") return "Persona Natural (DNI)";
  return tipoDocumento || "—";
}

export default function RegistrarVenta({ productos, socios }: Props) {
  const sesion = obtenerSesion();
  const usuarioId = sesion?.id ?? 0;
  const empleadoNombre = sesion?.nombreCompleto ?? sesion?.usuario ?? "—";

  const [clienteId, setClienteId] = useState<number>(0);
  const [tipoDocumento, setTipoDocumento] = useState<string>("BOLETA");
  const [serie, setSerie] = useState<string>("");
  const [numeroDocumento, setNumeroDocumento] = useState<string>("");
  const [fechaVenta, setFechaVenta] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [observacion, setObservacion] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<string>("EFECTIVO");
  const [moneda, setMoneda] = useState<string>("PEN");
  const [diasCredito, setDiasCredito] = useState<number>(7);

  const [detalles, setDetalles] = useState<VentaDetalle[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "success" | "error"; mensaje: string } | null>(null);

  const clienteSeleccionado = socios.find((s) => s.id === clienteId) ?? null;
  const esCredito = metodoPago === "CREDITO";
  const simboloMoneda = MONEDAS.find((m) => m.codigo === moneda)?.simbolo ?? "S/";

  const fechaVencimiento = useMemo(() => {
    if (!esCredito || !fechaVenta) return null;
    const base = new Date(fechaVenta);
    base.setDate(base.getDate() + diasCredito);
    return base.toISOString().slice(0, 10);
  }, [esCredito, fechaVenta, diasCredito]);

  const agregarDetalle = () => {
    if (productos.length === 0) {
      setAviso({ tipo: "error", mensaje: "No hay productos disponibles." });
      return;
    }
    const prod = productos[0];
    const precio = prod.precioVenta ?? 0;
    setDetalles([
      ...detalles,
      {
        productoId: prod.id,
        cantidad: 1,
        precioUnitario: precio,
        descuento: 0,
        total: precio,
      },
    ]);
  };

  const eliminarDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const actualizarDetalle = (index: number, campo: keyof VentaDetalle, valor: any) => {
    const nuevos = [...detalles];
    nuevos[index] = { ...nuevos[index], [campo]: valor };

    if (campo === "productoId") {
      const prod = productos.find((p) => p.id === valor);
      if (prod) {
        nuevos[index].precioUnitario = prod.precioVenta ?? 0;
        nuevos[index].descuento = 0;
      }
    }

    nuevos[index].total =
      nuevos[index].cantidad * (nuevos[index].precioUnitario ?? 0) -
      (nuevos[index].descuento ?? 0);

    setDetalles(nuevos);
  };

  const subTotal = useMemo(
    () => detalles.reduce((acc, d) => acc + (d.total || 0), 0),
    [detalles]
  );
  const igv = +(subTotal * 0.18).toFixed(2);
  const total = subTotal + igv;

  const faltaCliente = intentoEnviar && clienteId === 0;
  const faltaSerie = intentoEnviar && !serie;
  const faltaNumero = intentoEnviar && !numeroDocumento;

  function limpiarFormulario() {
    setClienteId(0);
    setTipoDocumento("BOLETA");
    setSerie("");
    setNumeroDocumento("");
    setFechaVenta(new Date().toISOString().slice(0, 10));
    setObservacion("");
    setMetodoPago("EFECTIVO");
    setMoneda("PEN");
    setDiasCredito(7);
    setDetalles([]);
    setIntentoEnviar(false);
  }

  const registrarVenta = async () => {
    setIntentoEnviar(true);

    if (clienteId === 0) {
      setAviso({ tipo: "error", mensaje: "Debe seleccionar un cliente." });
      return;
    }
    if (!tipoDocumento || !serie || !numeroDocumento) {
      setAviso({ tipo: "error", mensaje: "Debe completar Documento, Serie y Número." });
      return;
    }
    if (detalles.length === 0) {
      setAviso({ tipo: "error", mensaje: "Debe agregar al menos un producto." });
      return;
    }

    const venta = {
      clienteId,
      usuarioId,
      fecha: new Date(fechaVenta).toISOString(),
      tipoDocumento,
      serie,
      numeroDocumento,
      subTotal,
      igv,
      total,
      moneda,
      metodoPago,
      diasCredito: esCredito ? diasCredito : null,
      observacion,
      detalles: detalles.map((d) => ({
        productoId: d.productoId,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        descuento: d.descuento,
        total: d.total,
      })),
    };

    setEnviando(true);
    try {
      const { data } = await axios.post(apiUrl("/Ventas"), venta);
      const numeroVenta = data.ventaId ?? data.id ?? data.Id ?? "s/n";
      const asiento = data.asientoId ?? data.AsientoId;
      const vencimientoConfirmado = data.fechaVencimiento ?? data.FechaVencimiento;
      const notaVencimiento =
        esCredito && vencimientoConfirmado
          ? ` — Vence ${new Date(vencimientoConfirmado).toLocaleDateString("es-PE")}`
          : "";
      setAviso({
        tipo: "success",
        mensaje: `${data.mensaje ?? "Venta registrada"} — Nº ${numeroVenta}${asiento ? `, Asiento Nº ${asiento}` : ""}${notaVencimiento}`,
      });
      limpiarFormulario();
    } catch (error: any) {
      console.error(error);
      const detalle =
        error.response?.data?.error ??
        error.response?.data?.mensaje ??
        error.response?.data?.detalle ??
        error.response?.data?.title ??
        "No se pudo registrar la venta.";
      setAviso({ tipo: "error", mensaje: detalle });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, border: "1px solid", borderColor: "divider" }} elevation={0}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
        <PointOfSale color="primary" fontSize="large" />
        <Box>
          <Typography variant="h5">Registrar Venta</Typography>
          <Typography variant="body2" color="text.secondary">
            Emite el comprobante y registra los productos vendidos al cliente.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {/* ---------- Columna principal ---------- */}
        <Grid item xs={12} md={8}>
          {/* Cliente a ancho completo */}
          <Autocomplete
            options={socios}
            getOptionLabel={(s) => s.nombres}
            filterOptions={filtroSocios}
            value={clienteSeleccionado}
            onChange={(_, valor) => setClienteId(valor ? valor.id : 0)}
            componentsProps={{ paper: { sx: { minWidth: 340 } } }}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", minWidth: 0 }}>
                  <Chip
                    label={option.numeroDocumento}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: "monospace", fontSize: 11.5, height: 22, flexShrink: 0 }}
                  />
                  <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                    {option.nombres}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {option.tipoDocumento}
                  </Typography>
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Cliente"
                placeholder="Buscar por DNI, RUC o nombre..."
                error={faltaCliente}
                helperText={faltaCliente ? "Seleccione un cliente" : " "}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />

          {/* Tarjeta resumen del cliente seleccionado */}
          {clienteSeleccionado && (
            <Paper
              variant="outlined"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2.5,
                flexWrap: "wrap",
                px: 2,
                py: 1.25,
                mt: 1.5,
                bgcolor: "action.hover",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Person fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>{clienteSeleccionado.nombres}</strong>
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Badge fontSize="small" color="action" />
                <Typography variant="body2" fontFamily="monospace">
                  {clienteSeleccionado.tipoDocumento} {clienteSeleccionado.numeroDocumento}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Business fontSize="small" color="action" />
                <Chip
                  size="small"
                  label={tipoClienteLabel(clienteSeleccionado.tipoDocumento)}
                  color={clienteSeleccionado.tipoDocumento?.toUpperCase() === "RUC" ? "primary" : "default"}
                  variant="outlined"
                />
              </Box>
            </Paper>
          )}

          {/* Tipo / Serie / Correlativo / Moneda agrupados */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.3 }}
            >
              Comprobante
            </Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.25 }}>
              <Grid item xs={6} sm={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Tipo"
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                >
                  {TIPOS_DOCUMENTO.map((tipo) => (
                    <MenuItem key={tipo} value={tipo}>
                      {tipo}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Serie"
                  placeholder="B001"
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  error={faltaSerie}
                  helperText={faltaSerie ? "Requerido" : " "}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Correlativo"
                  placeholder="000123"
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  error={faltaNumero}
                  helperText={faltaNumero ? "Requerido" : " "}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Moneda"
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoney fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                >
                  {MONEDAS.map((m) => (
                    <MenuItem key={m.codigo} value={m.codigo}>
                      {m.simbolo} {m.codigo}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Paper>

          {/* Método de pago / Plazo */}
          <Grid container spacing={2} sx={{ mt: 0.25 }}>
            <Grid item xs={12} sm={esCredito ? 6 : 12}>
              <TextField
                select
                fullWidth
                label="Método de pago"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                helperText=" "
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Payments fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              >
                {METODOS_PAGO.map((mp) => (
                  <MenuItem key={mp} value={mp}>
                    {mp}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {esCredito && (
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Plazo de crédito"
                  value={diasCredito}
                  onChange={(e) => setDiasCredito(Number(e.target.value))}
                  helperText=" "
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Schedule fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                >
                  {PLAZOS_CREDITO.map((dias) => (
                    <MenuItem key={dias} value={dias}>
                      {dias} días
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>

          <TextField
            fullWidth
            label="Observación"
            placeholder="Notas internas sobre esta venta (opcional)"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            multiline
            minRows={1}
            sx={{ mt: 1 }}
          />
        </Grid>

        {/* ---------- Panel lateral: Estado / Empleado / Fechas ---------- */}
        <Grid item xs={12} md={4}>
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              bgcolor: "action.hover",
              position: { md: "sticky" },
              top: { md: 16 },
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 600 }}>
                Estado del documento
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip label="Nuevo — por registrar" color="default" variant="outlined" size="small" />
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 600 }}>
                Empleado
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.5 }}>
                <AssignmentInd fontSize="small" color="action" />
                <Typography variant="body2" fontWeight={600}>
                  {empleadoNombre}
                </Typography>
              </Box>
            </Box>

            <TextField
              fullWidth
              type="date"
              label="Fecha de venta"
              value={fechaVenta}
              onChange={(e) => setFechaVenta(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Event fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ bgcolor: "background.paper" }}
            />

            {esCredito && (
              <TextField
                fullWidth
                label="Fecha de vencimiento"
                value={
                  fechaVencimiento
                    ? new Date(fechaVencimiento).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : ""
                }
                helperText="Calculada automáticamente"
                InputProps={{ readOnly: true }}
                sx={{ bgcolor: "background.paper" }}
              />
            )}
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* Detalle de productos */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Inventory2 fontSize="small" color="action" />
          <Typography variant="h6">Productos</Typography>
          {detalles.length > 0 && <Chip size="small" label={detalles.length} color="primary" variant="outlined" />}
        </Box>
        <Button variant="contained" color="success" startIcon={<Add />} onClick={agregarDetalle}>
          Agregar Producto
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell align="right" width={90}>Cantidad</TableCell>
              <TableCell align="right" width={120}>Precio Unit.</TableCell>
              <TableCell align="right" width={100}>Descuento</TableCell>
              <TableCell align="right" width={120}>Total</TableCell>
              <TableCell align="center" width={70}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {detalles.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box sx={{ py: 5, textAlign: "center", color: "text.secondary" }}>
                    <Typography variant="body2">
                      Aún no agregaste productos. Usa "Agregar Producto" para empezar.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}

            {detalles.map((d, i) => (
              <TableRow key={i} hover>
                <TableCell>
                  {/* 
                  <Autocomplete
                    size="small"
                    options={productos}
                    getOptionLabel={(p) => p.nombre}
                    value={productos.find((p) => p.id === d.productoId) ?? null}
                    onChange={(_, valor) => actualizarDetalle(i, "productoId", valor ? valor.id : 0)}
                    sx={{ minWidth: 220 }}
                    renderInput={(params) => <TextField {...params} placeholder="Seleccione producto" />}
                  />*/}
                  <Autocomplete
                    size="small"
                    options={productos}
                    getOptionLabel={(p) => `${p.codigo} - ${p.nombre}`}
                    value={productos.find((p) => p.id === d.productoId) ?? null}
                    onChange={(_, valor) => actualizarDetalle(i, "productoId", valor ? valor.id : 0)}
                    sx={{ minWidth: 280 }}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                          <Chip
                            label={option.codigo}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: "monospace", fontSize: 11, height: 20 }}
                          />
                          <Typography variant="body2">{option.nombre}</Typography>
                        </Box>
                      </li>
                    )}
                    renderInput={(params) => <TextField {...params} placeholder="Buscar por código o nombre..." />}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    size="small"
                    value={d.cantidad}
                    inputProps={{ min: 0, style: { textAlign: "right" } }}
                    onChange={(e) => actualizarDetalle(i, "cantidad", Number(e.target.value))}
                    sx={{ width: 85 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    size="small"
                    value={d.precioUnitario}
                    inputProps={{ min: 0, step: 0.01, style: { textAlign: "right" } }}
                    onChange={(e) => actualizarDetalle(i, "precioUnitario", Number(e.target.value))}
                    sx={{ width: 105 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    size="small"
                    value={d.descuento}
                    inputProps={{ min: 0, step: 0.01, style: { textAlign: "right" } }}
                    onChange={(e) => actualizarDetalle(i, "descuento", Number(e.target.value))}
                    sx={{ width: 85 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                    {simboloMoneda} {formatoMoneda(d.total)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" color="error" onClick={() => eliminarDetalle(i)} aria-label="Eliminar producto">
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Totales */}
      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
        <Box sx={{ minWidth: 260 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
            <Typography variant="body2" color="text.secondary">SubTotal</Typography>
            <Typography variant="body2" fontFamily="monospace">{simboloMoneda} {formatoMoneda(subTotal)}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
            <Typography variant="body2" color="text.secondary">IGV (18%)</Typography>
            <Typography variant="body2" fontFamily="monospace">{simboloMoneda} {formatoMoneda(igv)}</Typography>
          </Box>
          {esCredito && fechaVencimiento && (
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Vence</Typography>
              <Typography variant="body2" fontFamily="monospace" color="error.main">
                {new Date(fechaVencimiento).toLocaleDateString("es-PE")}
              </Typography>
            </Box>
          )}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="h6">Total</Typography>
            <Typography variant="h6" fontFamily="monospace" color="primary.main">
              {simboloMoneda} {formatoMoneda(total)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : <Save />}
          size="large"
          onClick={registrarVenta}
          disabled={enviando}
          sx={{ px: 4 }}
        >
          {enviando ? "Registrando..." : "Registrar Venta"}
        </Button>
      </Box>

      <Snackbar
        open={!!aviso}
        autoHideDuration={5000}
        onClose={() => setAviso(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={aviso?.tipo} onClose={() => setAviso(null)} variant="filled" sx={{ width: "100%" }}>
          {aviso?.mensaje}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
