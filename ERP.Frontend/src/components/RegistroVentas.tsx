import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { Assignment, Receipt, CalendarMonth, AccountBalance } from "@mui/icons-material";
import { reporteRegistroVentas, RegistroVenta } from "../api/reportes";
import AsientoContableModal from "./AsientoContableModal";

function formatoMoneda(valor: number) {
  return valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function primerDiaDelMes() {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function RegistroVentas() {
  const [fechaInicio, setFechaInicio] = useState(primerDiaDelMes());
  const [fechaFin, setFechaFin] = useState(hoyISO());
  const [registros, setRegistros] = useState<RegistroVenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [asientoSeleccionado, setAsientoSeleccionado] = useState<number | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const data = await reporteRegistroVentas(fechaInicio, fechaFin);
      setRegistros(data);
    } catch (error: any) {
      setAviso(error.message ?? "No se pudo cargar el registro de ventas.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totales = useMemo(
    () =>
      registros.reduce(
        (acc, r) => ({
          base: acc.base + r.baseImponible,
          igv: acc.igv + r.igv,
          total: acc.total + r.total,
        }),
        { base: 0, igv: 0, total: 0 }
      ),
    [registros]
  );

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, border: "1px solid", borderColor: "divider" }} elevation={0}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Assignment color="primary" fontSize="large" />
        <Box>
          <Typography variant="h5">Registro de Ventas</Typography>
          <Typography variant="body2" color="text.secondary">
            Comprobantes emitidos en el periodo, con su base imponible e IGV.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap", alignItems: "flex-end" }}>
        <TextField
          label="Desde"
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: <CalendarMonth fontSize="small" color="action" sx={{ mr: 1 }} />,
          }}
        />
        <TextField
          label="Hasta"
          type="date"
          value={fechaFin}
          onChange={(e) => setFechaFin(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={cargar} disabled={cargando}>
          {cargando ? "Buscando..." : "Buscar"}
        </Button>
      </Box>

      {/* Totales del periodo */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Paper variant="outlined" sx={{ p: 2, minWidth: 160 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 600 }}>
            Base Imponible
          </Typography>
          <Typography variant="h6" fontFamily="monospace" fontWeight={700}>
            S/ {formatoMoneda(totales.base)}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, minWidth: 160 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 600 }}>
            IGV
          </Typography>
          <Typography variant="h6" fontFamily="monospace" fontWeight={700}>
            S/ {formatoMoneda(totales.igv)}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, minWidth: 160 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", fontWeight: 600 }}>
            Total
          </Typography>
          <Typography variant="h6" fontFamily="monospace" fontWeight={700} color="primary.main">
            S/ {formatoMoneda(totales.total)}
          </Typography>
        </Paper>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Comprobante</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Doc.</TableCell>
              <TableCell align="right">Base Imp.</TableCell>
              <TableCell align="right">IGV</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Asiento</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cargando && (
              <TableRow>
                <TableCell colSpan={9}>
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress size={28} />
                  </Box>
                </TableCell>
              </TableRow>
            )}

            {!cargando && registros.length === 0 && (
              <TableRow>
                <TableCell colSpan={9}>
                  <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                    <Typography variant="body2">No hay ventas registradas en este periodo.</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}

            {registros.map((r) => (
              <TableRow key={r.ventaId} hover>
                <TableCell>{new Date(r.fecha).toLocaleDateString("es-PE")}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Receipt fontSize="small" color="action" />
                    {r.tipoDocumento} {r.serie}-{r.numeroDocumento}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{r.cliente}</Typography>
                  <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                    {r.tipoDocumentoCliente} {r.numeroDocumentoCliente}
                  </Typography>
                </TableCell>
                <TableCell>{r.moneda ?? "PEN"}</TableCell>
                <TableCell align="right" sx={{ fontFamily: "monospace" }}>
                  S/ {formatoMoneda(r.baseImponible)}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: "monospace" }}>
                  S/ {formatoMoneda(r.igv)}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                  S/ {formatoMoneda(r.total)}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={r.estado}
                    color={r.estado === "REGISTRADO" ? "success" : r.estado === "ANULADO" ? "error" : "default"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  {r.asientoId ? (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AccountBalance fontSize="small" />}
                      onClick={() => setAsientoSeleccionado(r.asientoId)}
                    >
                      Ver
                    </Button>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AsientoContableModal asientoId={asientoSeleccionado} onClose={() => setAsientoSeleccionado(null)} />

      <Snackbar open={!!aviso} autoHideDuration={5000} onClose={() => setAviso(null)}>
        <Alert severity="error" onClose={() => setAviso(null)} variant="filled">
          {aviso}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
