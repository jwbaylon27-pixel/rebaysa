import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { Payments, Receipt, AttachMoney, Refresh } from "@mui/icons-material";
import {
  listarVentasPendientes,
  registrarPagoVenta,
  VentaPendiente,
} from "../api/pagosVenta";

function formatoMoneda(valor: number) {
  return valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function estadoVencimiento(diasVencido: number) {
  if (diasVencido > 0) return { label: `Vencida hace ${diasVencido} día${diasVencido === 1 ? "" : "s"}`, color: "error" as const };
  if (diasVencido === 0) return { label: "Vence hoy", color: "warning" as const };
  return { label: `Vence en ${Math.abs(diasVencido)} día${Math.abs(diasVencido) === 1 ? "" : "s"}`, color: "default" as const };
}

export default function CobrosVenta() {
  const [pendientes, setPendientes] = useState<VentaPendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState<VentaPendiente | null>(null);
  const [monto, setMonto] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<"EFECTIVO" | "TRANSFERENCIA">("EFECTIVO");
  const [observacion, setObservacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "success" | "error"; mensaje: string } | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const data = await listarVentasPendientes();
      setPendientes(data);
    } catch (error: any) {
      setAviso({ tipo: "error", mensaje: error.message ?? "No se pudieron cargar las facturas pendientes." });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const totalPendiente = useMemo(
    () => pendientes.reduce((acc, v) => acc + v.saldoPendiente, 0),
    [pendientes]
  );

  function abrirDialogo(venta: VentaPendiente) {
    setSeleccionada(venta);
    setMonto(venta.saldoPendiente.toFixed(2));
    setMetodoPago("EFECTIVO");
    setObservacion("");
  }

  function cerrarDialogo() {
    setSeleccionada(null);
  }

  async function confirmarCobro() {
    if (!seleccionada) return;
    const montoNumero = Number(monto);

    if (!montoNumero || montoNumero <= 0) {
      setAviso({ tipo: "error", mensaje: "Ingresa un monto válido." });
      return;
    }
    if (montoNumero > seleccionada.saldoPendiente + 0.005) {
      setAviso({ tipo: "error", mensaje: "El monto no puede superar el saldo pendiente." });
      return;
    }

    setEnviando(true);
    try {
      const resultado = await registrarPagoVenta(seleccionada.ventaId, {
        monto: montoNumero,
        metodoPago,
        observacion: observacion || undefined,
      });
      setAviso({ tipo: "success", mensaje: resultado.mensaje });
      cerrarDialogo();
      cargar();
    } catch (error: any) {
      setAviso({ tipo: "error", mensaje: error.message ?? "No se pudo registrar el cobro." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, border: "1px solid", borderColor: "divider" }} elevation={0}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Payments color="primary" fontSize="large" />
          <Box>
            <Typography variant="h5">Cobros de Ventas</Typography>
            <Typography variant="body2" color="text.secondary">
              Facturas al crédito pendientes de pago, total o parcial.
            </Typography>
          </Box>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={cargar}>
          Actualizar
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, display: "inline-flex", alignItems: "center", gap: 1.5 }}>
        <AttachMoney color="error" />
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 600 }}>
            Total pendiente de cobro
          </Typography>
          <Typography variant="h6" fontFamily="monospace" fontWeight={700}>
            S/ {formatoMoneda(totalPendiente)}
          </Typography>
        </Box>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell>Documento</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Pagado</TableCell>
              <TableCell align="right">Saldo</TableCell>
              <TableCell>Vencimiento</TableCell>
              <TableCell align="center">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cargando && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress size={28} />
                  </Box>
                </TableCell>
              </TableRow>
            )}

            {!cargando && pendientes.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                    <Typography variant="body2">No hay facturas pendientes de cobro. 🎉</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}

            {pendientes.map((v) => {
              const estado = estadoVencimiento(v.diasVencido);
              return (
                <TableRow key={v.ventaId} hover>
                  <TableCell>{v.cliente}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Receipt fontSize="small" color="action" />
                      {v.tipoDocumento} {v.serie}-{v.numeroDocumento}
                    </Box>
                  </TableCell>
                  <TableCell>{new Date(v.fecha).toLocaleDateString("es-PE")}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: "monospace" }}>
                    S/ {formatoMoneda(v.total)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: "monospace" }}>
                    S/ {formatoMoneda(v.montoPagado)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                    S/ {formatoMoneda(v.saldoPendiente)}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={estado.label} color={estado.color} variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="contained" onClick={() => abrirDialogo(v)}>
                      Registrar cobro
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo de cobro */}
      <Dialog open={!!seleccionada} onClose={cerrarDialogo} maxWidth="xs" fullWidth>
        <DialogTitle>Registrar cobro</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {seleccionada && (
            <>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {seleccionada.cliente}
                </Typography>
                <Typography variant="subtitle2">
                  {seleccionada.tipoDocumento} {seleccionada.serie}-{seleccionada.numeroDocumento}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Saldo pendiente: S/ {formatoMoneda(seleccionada.saldoPendiente)}
                </Typography>
              </Box>

              <TextField
                label="Monto a cobrar"
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">S/</InputAdornment>,
                }}
                inputProps={{ min: 0, step: 0.01, max: seleccionada.saldoPendiente }}
                autoFocus
                fullWidth
              />

              <TextField
                select
                label="Método de cobro"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as "EFECTIVO" | "TRANSFERENCIA")}
                fullWidth
              >
                <MenuItem value="EFECTIVO">Efectivo (Caja)</MenuItem>
                <MenuItem value="TRANSFERENCIA">Transferencia / Depósito</MenuItem>
              </TextField>

              <TextField
                label="Observación (opcional)"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                multiline
                minRows={1}
                fullWidth
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={cerrarDialogo} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={confirmarCobro}
            disabled={enviando}
            startIcon={enviando ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {enviando ? "Registrando..." : "Confirmar cobro"}
          </Button>
        </DialogActions>
      </Dialog>

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
