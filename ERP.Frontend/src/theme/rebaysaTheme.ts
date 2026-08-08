import { createTheme } from "@mui/material/styles";

// Mismos tokens de marca usados en el módulo Kardex:
// grafito/verde-azulado como color principal, rojo como acento.
const rebaysaTheme = createTheme({
  palette: {
    primary: {
      main: "#12333a",
      light: "#1c4750",
      dark: "#0b2227",
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
      default: "#f5f7f8",
      paper: "#ffffff",
    },
    text: {
      primary: "#12242a",
      secondary: "#4b6068",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    h5: { fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 7,
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