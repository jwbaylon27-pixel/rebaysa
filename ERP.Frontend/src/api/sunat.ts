export interface RucConsulta {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  estado: string;
  condicion: string;
}

export async function consultarRuc(
  ruc: string
): Promise<RucConsulta> {
  const numero = ruc.trim();

  if (!/^\d{11}$/.test(numero)) {
    throw new Error("Ingresa un RUC válido de 11 dígitos.");
  }

  const response = await fetch(
    `/api/sunat/ruc/${numero}`
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.mensaje ?? "No se pudo consultar el RUC."
    );
  }

  return data as RucConsulta;
}