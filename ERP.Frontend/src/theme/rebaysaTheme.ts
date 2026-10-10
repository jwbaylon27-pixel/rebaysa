import { createTheme } from "@mui/material/styles";

// Mismos tokens de marca usados en el módulo Kardex:
// grafito/verde-azulado como color principal, rojo como acento.
const rebaysaTheme = createTheme({
  palette: {
    primary: {
      main: "#2563eb",
      light: "#4f83f1",
      dark: "#1d4ed8",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#d64545",
      light: "#e26a6a",
      dark: "#b23333",
      contrastText: "#ffffff",
    },
    success: {
      main: "#1e9d66",
    },
    error: {
      main: "#d64545",
    },
    background: {
      default: "#f4f7fb",
      paper: "#ffffff",
    },
    text: {
      primary: "#12242a",
      secondary: "#4b6068",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    h5: { fontWeight: 800, letterSpacing: "-0.025em" },
    h6: { fontWeight: 700, letterSpacing: "-0.015em" },
    button: { fontWeight: 700 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(18, 51, 58, 0.08)",
          boxShadow: "0 8px 24px rgba(18, 51, 58, 0.06)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
          borderRadius: 9,
          paddingInline: 16,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: 11.5,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          color: "#4b6068",
          backgroundColor: "#f5f7f8",
        },
      },
    },
  },
});

export default rebaysaTheme;
