import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  Checkbox,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
} from "@mui/material";
import { Undo, Receipt, Inventory2, WarningAmber, Event } from "@mui/icons-material";
import { createFilterOptions } from "@mui/material/Autocomplete";
import {
  listarMovimientosComerciales,
  MovimientoComercial,
} from "../api/procesosComerciales";
import {
  consultarDisponible,
  registrarNotaCredito,
  VentaCreditoDisponible,
} from "../api/Notascredito";
import { obtenerSesion } from "../auth";

function formatoMoneda(valor: number) {
  return valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const filtroVentas = createFilterOptions<MovimientoComercial>({
  stringify: (v) => `${v.id} ${v.socio}`,
});

export default function RegistrarNotaCredito() {
  const sesion = obtenerSesion();
  const usuarioId = sesion?.id;

  const [ventas, setVentas] = useState<MovimientoComercial[]>([]);
  const [cargandoVentas, setCargandoVentas] = useState(true);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<MovimientoComercial | null>(null);

  const [disponible, setDisponible] = useState<VentaCreditoDisponible | null>(null);
  const [cargandoDisponible, setCargandoDisponible] = useState(false);

  const [tipoAfectacion, setTipoAfectacion] = useState<"TOTAL" | "PARCIAL">("TOTAL");
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [devolucionFisica, setDevolucionFisica] = useState(false);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [serie, setSerie] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [motivo, setMotivo] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "success" | "error"; mensaje: string } | null>(null);

  useEffect(() => {
    listarMovimientosComerciales("venta")
      .then(setVentas)
      .catch((err) => setAviso({ tipo: "error", mensaje: err.message ?? "No se pudieron cargar las ventas." }))
      .finally(() => setCargandoVentas(false));
  }, []);

  useEffect(() => {
    if (!ventaSeleccionada) {
      setDisponible(null);
      setCantidades({});
      return;
    }
    setCargandoDisponible(true);
    consultarDisponible(ventaSeleccionada.id)
      .then((data) => {
        setDisponible(data);
        setCantidades(
          Object.fromEntries(data.items.map((i) => [i.productoId, 0]))
        );
      })
      .catch((err) => setAviso({ tipo: "error", mensaje: err.message ?? "No se pudo consultar lo disponible." }))
      .finally(() => setCargandoDisponible(false));
  }, [ventaSeleccionada]);

  const itemsParaTotal = useMemo(
    () => (disponible ? disponible.items.filter((i) => i.cantidadDisponible > 0) : []),
    [disponible]
  );

  const previsualizacion = useMemo(() => {
    if (!disponible) return { subTotal: 0, igv: 0, total: 0 };

    const items =
      tipoAfectacion === "TOTAL"
        ? itemsParaTotal.map((i) => ({ ...i, cantidad: i.cantidadDisponible }))
        : disponible.items
            .map((i) => ({ ...i, cantidad: cantidades[i.productoId] ?? 0 }))
            .filter((i) => i.cantidad > 0);

    const subTotal = items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
    const igv = +(subTotal * 0.18).toFixed(2);
    return { subTotal, igv, total: subTotal + igv };
  }, [disponible, tipoAfectacion, cantidades, itemsParaTotal]);

  function limpiarFormulario() {
    setVentaSeleccionada(null);
    setDisponible(null);
    setTipoAfectacion("TOTAL");
    setCantidades({});
    setDevolucionFisica(false);
    setFecha(new Date().toISOString().slice(0, 10));
    setSerie("");
    setNumeroDocumento("");
    setMotivo("");
  }

  async function registrar() {
    if (!ventaSeleccionada || !disponible) {
      setAviso({ tipo: "error", mensaje: "Selecciona primero una venta." });
      return;
    }
    if (!serie || !numeroDocumento) {
      setAviso({ tipo: "error", mensaje: "Completa Serie y Número de la nota de crédito." });
      return;
    }
    if (previsualizacion.total <= 0) {
      setAviso({ tipo: "error", mensaje: "No hay ningún producto/cantidad para acreditar." });
      return;
    }

    const detalles =
      tipoAfectacion === "PARCIAL"
        ? Object.entries(cantidades)
            .filter(([, cantidad]) => cantidad > 0)
            .map(([productoId, cantidad]) => ({ productoId: Number(productoId), cantidad }))
        : undefined;

    setEnviando(true);
    try {
      const resultado = await registrarNotaCredito({
        ventaId: ventaSeleccionada.id,
        serie,
        numeroDocumento,
        motivo: motivo || undefined,
        tipoAfectacion,
        devolucionFisica,
        detalles,
        usuarioId,
      });
      setAviso({
        tipo: "success",
        mensaje: `${resultado.mensaje} — Nº ${resultado.notaCreditoId}, Asiento Nº ${resultado.asientoId}${
          resultado.ventaAnulada ? " · Venta anulada" : ""
        }`,
      });
      limpiarFormulario();
      setCargandoVentas(true);
      listarMovimientosComerciales("venta")
        .then(setVentas)
        .finally(() => setCargandoVentas(false));
    } catch (error: any) {
      setAviso({ tipo: "error", mensaje: error.message ?? "No se pudo registrar la nota de crédito." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, border: "1px solid", borderColor: "divider" }} elevation={0}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Undo color="primary" fontSize="large" />
        <Box>
          <Typography variant="h5">Nota de Crédito</Typography>
          <Typography variant="body2" color="text.secondary">
            Anula total o parcialmente una venta ya registrada.
          </Typography>
        </Box>
      </Box>

      <Autocomplete
        options={ventas}
        loading={cargandoVentas}
        filterOptions={filtroVentas}
        getOptionLabel={(v) => `${v.socio} — Venta Nº ${v.id} (S/ ${formatoMoneda(v.total)})`}
        value={ventaSeleccionada}
        onChange={(_, valor) => setVentaSeleccionada(valor)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Venta a acreditar"
            placeholder="Buscar por cliente o número de venta..."
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <Receipt fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        )}
      />

      {cargandoDisponible && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {disponible && !cargandoDisponible && (
        <>
          {/* Resumen de la venta */}
          <Paper variant="outlined" sx={{ p: 2, mt: 2.5, mb: 2.5, bgcolor: "action.hover" }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Comprobante</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {disponible.tipoDocumento} {disponible.serie}-{disponible.numeroDocumento}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Cliente</Typography>
                <Typography variant="body2" fontWeight={600}>{disponible.cliente}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total venta</Typography>
                <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                  S/ {formatoMoneda(disponible.totalVenta)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Ya acreditado</Typography>
                <Typography variant="body2" fontFamily="monospace" fontWeight={600} color="error.main">
                  S/ {formatoMoneda(disponible.totalAcreditado)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Disponible</Typography>
                <Typography variant="body2" fontFamily="monospace" fontWeight={700} color="success.main">
                  S/ {formatoMoneda(disponible.totalDisponible)}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {!disponible.puedeAcreditar ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "warning.main", py: 2 }}>
              <WarningAmber />
              <Typography variant="body2">
                Esta venta ya no tiene saldo disponible para acreditar (está anulada o ya se acreditó por completo).
              </Typography>
            </Box>
          ) : (
            <>
              {/* Tipo de nota */}
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Tipo de nota
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={tipoAfectacion}
                  onChange={(_, v) => v && setTipoAfectacion(v)}
                  size="small"
                >
                  <ToggleButton value="TOTAL">Total</ToggleButton>
                  <ToggleButton value="PARCIAL">Parcial</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box sx={{display: "inline-flex",alignItems: "flex-start",gap: 1.5,mb: 2, flexWrap: "wrap",width: "fit-content",}}>
                <TextField label="Serie" placeholder="NC01" value={serie} onChange={(e) => setSerie(e.target.value)} sx={{ width: 110 }} />
                <TextField label="Número" placeholder="000045" value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} sx={{ width: 130 }} />
                <TextField type="date" label="Fecha de NCredito" value={fecha} onChange={(e) => setFecha(e.target.value)} helperText=" " sx={{ width: 150 }} />
              </Box>

              {/* Detalle de productos */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <Inventory2 fontSize="small" color="action" />
                <Typography variant="subtitle2">Productos a acreditar</Typography>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2.5 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell align="right">Vendido</TableCell>
                      <TableCell align="right">Ya acreditado</TableCell>
                      <TableCell align="right">Disponible</TableCell>
                      <TableCell align="right">Precio Unit.</TableCell>
                      <TableCell align="right" width={120}>
                        {tipoAfectacion === "TOTAL" ? "A acreditar" : "Cantidad"}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {disponible.items.map((item) => (
                      <TableRow key={item.productoId} hover>
                        <TableCell>{item.producto}</TableCell>
                        <TableCell align="right">{item.cantidadOriginal}</TableCell>
                        <TableCell align="right">{item.cantidadAcreditada}</TableCell>
                        <TableCell align="right">{item.cantidadDisponible}</TableCell>
                        <TableCell align="right" sx={{ fontFamily: "monospace" }}>
                          S/ {formatoMoneda(item.precioUnitario)}
                        </TableCell>
                        <TableCell align="right">
                          {tipoAfectacion === "TOTAL" ? (
                            <Typography variant="body2" fontWeight={600}>
                              {item.cantidadDisponible}
                            </Typography>
                          ) : (
                            <TextField
                              type="number"
                              size="small"
                              value={cantidades[item.productoId] ?? 0}
                              disabled={item.cantidadDisponible === 0}
                              inputProps={{ min: 0, max: item.cantidadDisponible, style: { textAlign: "right" } }}
                              onChange={(e) => {
                                const valor = Math.max(
                                  0,
                                  Math.min(Number(e.target.value), item.cantidadDisponible)
                                );
                                setCantidades((prev) => ({ ...prev, [item.productoId]: valor }));
                              }}
                              sx={{ width: 90 }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={devolucionFisica}
                    onChange={(e) => setDevolucionFisica(e.target.checked)}
                  />
                }
                label="Hubo devolución física de los productos (regresa el stock al inventario)"
                sx={{ mb: 2 }}
              />
               {/* <Box sx={{ display: "flex", gap: 3, mb: 3, flexWrap: "wrap" }}>  PARA UNA SOLA LINEA (SERIE,NUMERO Y FECHA) */}
             
              <TextField
                fullWidth
                label="Motivo"
                placeholder="Ej: Devolución por producto defectuoso, error de facturación, etc."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                multiline
                minRows={1}
                sx={{ mb: 3 }}
              />

              {/* Totales */}
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
                <Box sx={{ minWidth: 260 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">SubTotal</Typography>
                    <Typography variant="body2" fontFamily="monospace">S/ {formatoMoneda(previsualizacion.subTotal)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">IGV (18%)</Typography>
                    <Typography variant="body2" fontFamily="monospace">S/ {formatoMoneda(previsualizacion.igv)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="h6">Total a acreditar</Typography>
                    <Typography variant="h6" fontFamily="monospace" color="error.main">
                      S/ {formatoMoneda(previsualizacion.total)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  onClick={registrar}
                  disabled={enviando || previsualizacion.total <= 0}
                  startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : <Undo />}
                  sx={{ px: 4 }}
                >
                  {enviando ? "Registrando..." : "Registrar Nota de Crédito"}
                </Button>
              </Box>
            </>
          )}
        </>
      )}

      <Snackbar
        open={!!aviso}
        autoHideDuration={6000}
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