import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Box,
  CircularProgress,
  Chip,
} from "@mui/material";
import { obtenerAsientoContable, AsientoContable } from "../api/asientoContable";

function formatoMoneda(valor: number) {
  return valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  asientoId: number | null;
  onClose: () => void;
}

export default function AsientoContableModal({ asientoId, onClose }: Props) {
  const [asiento, setAsiento] = useState<AsientoContable | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (asientoId == null) {
      setAsiento(null);
      setError(null);
      return;
    }
    setCargando(true);
    setError(null);
    obtenerAsientoContable(asientoId)
      .then(setAsiento)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el asiento."))
      .finally(() => setCargando(false));
  }, [asientoId]);

  const cuadrado = asiento ? Math.abs(asiento.totalDebe - asiento.totalHaber) < 0.01 : true;

  return (
    <Dialog open={asientoId != null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Asiento Contable {asiento ? `Nº ${asiento.id}` : ""}</DialogTitle>
      <DialogContent>
        {cargando && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}

        {asiento && !cargando && (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {new Date(asiento.fecha).toLocaleDateString("es-PE")} · {asiento.tipoOperacion} · Ref. {asiento.referenciaId}
              </Typography>
              {asiento.glosa && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {asiento.glosa}
                </Typography>
              )}
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cuenta</TableCell>
                  <TableCell align="right">Debe</TableCell>
                  <TableCell align="right">Haber</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {asiento.detalles.map((linea, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                        {linea.cuentaCodigo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {linea.cuentaNombre}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: "monospace" }}>
                      {linea.debe > 0 ? `S/ ${formatoMoneda(linea.debe)}` : ""}
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: "monospace" }}>
                      {linea.haber > 0 ? `S/ ${formatoMoneda(linea.haber)}` : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
              <Typography variant="body2" fontWeight={700}>
                Totales: S/ {formatoMoneda(asiento.totalDebe)} / S/ {formatoMoneda(asiento.totalHaber)}
              </Typography>
              <Chip
                size="small"
                label={cuadrado ? "Cuadrado" : "Descuadrado"}
                color={cuadrado ? "success" : "error"}
                variant="outlined"
              />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
