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
  LocalShipping,
  Inventory2,
  Receipt,
  Event,
  Badge,
  Business,
  AssignmentInd,
  AttachMoney,
} from "@mui/icons-material";
import axios from "axios";
import { obtenerSesion } from "../auth";
import { createFilterOptions } from "@mui/material/Autocomplete";

const filtroSocios = createFilterOptions<SocioNegocio>({
  stringify: (s) => `${s.numeroDocumento} ${s.nombres}`,
});

type Producto = {
  id: number;
  codigo: string; 
  nombre: string;
  precioCompra: number;
};

type SocioNegocio = {
  id: number;
  tipoSocio: string;
  tipoDocumento: string; // DNI / RUC
  numeroDocumento: string;
  nombres: string;
};

type CompraDetalle = {
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

const TIPOS_DOCUMENTO = ["FACTURA", "BOLETA", "GUIA", "NOTA DE CREDITO"];
const MONEDAS = [
  { codigo: "PEN", simbolo: "S/", etiqueta: "Soles (PEN)" },
  { codigo: "USD", simbolo: "$", etiqueta: "Dólares (USD)" },
];

function formatoMoneda(valor: number) {
  return valor.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function tipoProveedorLabel(tipoDocumento: string) {
  const t = (tipoDocumento || "").toUpperCase();
  if (t === "RUC") return "Empresa (RUC)";
  if (t === "DNI") return "Persona Natural (DNI)";
  return tipoDocumento || "—";
}

export default function RegistrarCompra({ productos, socios }: Props) {
  const sesion = obtenerSesion();
  const usuarioId = sesion?.id ?? 0;
  const empleadoNombre = sesion?.nombreCompleto ?? sesion?.usuario ?? "—";

  const [proveedorId, setProveedorId] = useState<number>(0);
  const [tipoDocumento, setTipoDocumento] = useState<string>("FACTURA");
  const [serie, setSerie] = useState<string>("");
  const [numeroDocumento, setNumeroDocumento] = useState<string>("");
  const [fechaDocumento, setFechaDocumento] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [moneda, setMoneda] = useState<string>("PEN");
  const [observacion, setObservacion] = useState<string>("");

  const [detalles, setDetalles] = useState<CompraDetalle[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [intentoEnviar, setIntentoEnviar] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "success" | "error"; mensaje: string } | null>(null);

  const faltaProveedor = intentoEnviar && proveedorId === 0;
  const faltaSerie = intentoEnviar && !serie;
  const faltaNumero = intentoEnviar && !numeroDocumento;

  const proveedorSeleccionado = socios.find((s) => s.id === proveedorId) ?? null;
  const simboloMoneda = MONEDAS.find((m) => m.codigo === moneda)?.simbolo ?? "S/";

  const agregarDetalle = () => {
    if (productos.length === 0) {
      setAviso({ tipo: "error", mensaje: "No hay productos disponibles." });
      return;
    }
    const prod = productos[0];
    const precio = prod.precioCompra ?? 0;
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

  const actualizarDetalle = (index: number, campo: keyof CompraDetalle, valor: any) => {
    const nuevos = [...detalles];
    nuevos[index] = { ...nuevos[index], [campo]: valor };

    if (campo === "productoId") {
      const prod = productos.find((p) => p.id === valor);
      if (prod) {
        nuevos[index].precioUnitario = prod.precioCompra ?? 0;
        nuevos[index].cantidad = 1;
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

  function limpiarFormulario() {
    setProveedorId(0);
    setTipoDocumento("FACTURA");
    setSerie("");
    setNumeroDocumento("");
    setFechaDocumento(new Date().toISOString().slice(0, 10));
    setMoneda("PEN");
    setObservacion("");
    setDetalles([]);
    setIntentoEnviar(false);
  }

  const registrarCompra = async () => {
    setIntentoEnviar(true);

    if (proveedorId === 0) {
      setAviso({ tipo: "error", mensaje: "Debe seleccionar un proveedor." });
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

    const compra = {
      proveedorId,
      usuarioId,
      fecha: new Date(fechaDocumento).toISOString(),
      tipoDocumento,
      serie,
      numeroDocumento,
      moneda,
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
      const { data } = await axios.post("/api/Compras", compra);
      setAviso({
        tipo: "success",
        mensaje: `${data.mensaje ?? "Compra registrada"} — Nº ${data.compraId}, Asiento Nº ${data.asientoId}`,
      });
      limpiarFormulario();
    } catch (error: any) {
      console.error(error);
      const detalle =
        error.response?.data?.error ??
        error.response?.data?.mensaje ??
        error.response?.data?.detalle ??
        error.response?.data?.title ??
        "No se pudo registrar la compra.";
      setAviso({ tipo: "error", mensaje: detalle });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, border: "1px solid", borderColor: "divider" }} elevation={0}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Receipt color="primary" fontSize="large" />
        <Box>
          <Typography variant="h5">Registrar Compra</Typography>
          <Typography variant="body2" color="text.secondary">
            Ingresa el comprobante del proveedor y el detalle de productos recibidos.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {/* ---------- Columna principal ---------- */}
        <Grid item xs={12} md={8}>
          {/* Proveedor a ancho completo */}
          <Autocomplete
            options={socios}
            getOptionLabel={(s) => s.nombres}
            filterOptions={filtroSocios}
            value={proveedorSeleccionado}
            onChange={(_, valor) => setProveedorId(valor ? valor.id : 0)}
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
                label="Proveedor"
                placeholder="Buscar por DNI, RUC o nombre..."
                error={faltaProveedor}
                helperText={faltaProveedor ? "Seleccione un proveedor" : " "}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocalShipping fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />

          {/* Tarjeta resumen del proveedor seleccionado */}
          {proveedorSeleccionado && (
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
                <LocalShipping fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>{proveedorSeleccionado.nombres}</strong>
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Badge fontSize="small" color="action" />
                <Typography variant="body2" fontFamily="monospace">
                  {proveedorSeleccionado.tipoDocumento} {proveedorSeleccionado.numeroDocumento}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Business fontSize="small" color="action" />
                <Chip
                  size="small"
                  label={tipoProveedorLabel(proveedorSeleccionado.tipoDocumento)}
                  color={proveedorSeleccionado.tipoDocumento?.toUpperCase() === "RUC" ? "primary" : "default"}
                  variant="outlined"
                />
              </Box>
            </Paper>
          )}

          {/* Tipo / Serie / Correlativo agrupados */}
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
                  placeholder="F001"
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

          <TextField
            fullWidth
            label="Observación"
            placeholder="Notas internas sobre esta compra (opcional)"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            multiline
            minRows={1}
            sx={{ mt: 2 }}
          />
        </Grid>

        {/* ---------- Panel lateral: Estado / Empleado / Fecha ---------- */}
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
              label="Fecha del documento"
              value={fechaDocumento}
              onChange={(e) => setFechaDocumento(e.target.value)}
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
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* Detalle de productos */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
        <Table size="small" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell align="right" width={100}>Cantidad</TableCell>
              <TableCell align="right" width={130}>Precio Unit.</TableCell>
              <TableCell align="right" width={110}>Descuento</TableCell>
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
                   {/* original
                  <Autocomplete
                    size="small"
                    options={productos}
                    getOptionLabel={(p) => `${p.codigo} - ${p.nombre}`}
                    value={productos.find((p) => p.id === d.productoId) ?? null}
                    onChange={(_, valor) => actualizarDetalle(i, "productoId", valor ? valor.id : 0)}
                    sx={{ minWidth: 220 }}
                    renderInput={(params) => <TextField {...params} placeholder="Seleccione producto" />}
                  /> */}
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
                    sx={{ width: 90 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    size="small"
                    value={d.precioUnitario}
                    inputProps={{ min: 0, step: 0.01, style: { textAlign: "right" } }}
                    onChange={(e) => actualizarDetalle(i, "precioUnitario", Number(e.target.value))}
                    sx={{ width: 110 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    size="small"
                    value={d.descuento}
                    inputProps={{ min: 0, step: 0.01, style: { textAlign: "right" } }}
                    onChange={(e) => actualizarDetalle(i, "descuento", Number(e.target.value))}
                    sx={{ width: 90 }}
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
          onClick={registrarCompra}
          disabled={enviando}
          sx={{ px: 4 }}
        >
          {enviando ? "Registrando..." : "Registrar Compra"}
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
