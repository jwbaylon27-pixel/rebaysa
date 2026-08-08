export interface SocioNegocio {
  id: number; // 🔹 obligatorio
  tipoSocio: "C" | "P";
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  limiteCredito: number;
  saldo: number;
  activo: boolean;
  fechaRegistro?: string;
}

export interface SocioNegocioForm extends Partial<SocioNegocio> {
  id?: number; // opcional en el formulario
}
