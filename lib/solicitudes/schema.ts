// Esquema unico de la bandeja: los labels y los criterios se declaran aqui una
// sola vez y todos los componentes (bandeja, filtros, detalle) se derivan de el.
// Los campos siguen los JSON reales de validate / motor-data / motor-process.

import type { SolicitudEstado } from "@/lib/solicitudes/estados"

// Los estados y las reglas que los producen viven en estados.ts; aqui solo se
// reexportan para no tener que importar de dos sitios en los componentes.
export {
  ESTADO_LABEL,
  ESTADO_STYLES as estadoStyles,
  ESTADOS_ACTIVOS,
  ESTADOS_ASIGNABLES,
  SOLICITUD_ESTADOS as ESTADOS,
  esEstadoAsignable,
  esEstadoTerminal,
  type SolicitudEstado,
} from "@/lib/solicitudes/estados"

export const SECCIONES = [
  {
    titulo: "Solicitante",
    campos: [
      { key: "nombreCompleto", label: "Nombre completo" },
      { key: "cedula", label: "Cédula" },
      { key: "edad", label: "Edad" },
      { key: "antiguedadLaboral", label: "Antigüedad laboral" },
      { key: "celular", label: "Celular" },
      { key: "email", label: "Email" },
    ],
  },
  {
    titulo: "Solicitud",
    campos: [
      { key: "montoSolicitado", label: "Monto solicitado" },
      { key: "lineaCredito", label: "Línea de crédito" },
      { key: "perfil", label: "Perfil" },
      { key: "salario", label: "Salario" },
      { key: "egresosVolante", label: "Egresos volante" },
      { key: "deudaCooperativa", label: "Deuda cooperativa" },
      { key: "conceptoDefinitivo", label: "Concepto definitivo" },
      { key: "cuotaDefinitiva", label: "Cuota definitiva" },
      { key: "frecuenciaPago", label: "Frecuencia de pago" },
      { key: "usuarioCredito", label: "Usuario de crédito" },
    ],
  },
  {
    titulo: "Análisis del motor",
    campos: [
      { key: "ingresos", label: "Ingresos" },
      { key: "egresos", label: "Egresos" },
      { key: "minimoVital", label: "Mínimo vital" },
      { key: "solvencia", label: "Solvencia" },
      { key: "desprotegido", label: "Desprotegido" },
      { key: "disponible", label: "Disponible" },
      { key: "endeudamientoActual", label: "Endeudamiento actual" },
      { key: "endeudamientoProyectado", label: "Endeudamiento proyectado" },
    ],
  },
] as const

export const GRUPOS = [
  {
    titulo: "Valida 1 — Criterios del cliente",
    criterios: [
      { key: "valida1Inicial", nombre: "Valida 1 (Inicial)" },
      { key: "validaEdad", nombre: "Validación Edad" },
      { key: "validaActivo", nombre: "Validación Activo" },
      { key: "validaAsociado", nombre: "Validación Asociado" },
    ],
  },
  {
    titulo: "Identidad — Validación documental y facial",
    criterios: [
      { key: "estadoDocumento", nombre: "Estado Documento" },
      { key: "estadoFacial", nombre: "Estado Facial" },
      { key: "estadoGeneral", nombre: "Estado General" },
    ],
  },
  {
    titulo: "Motor de crédito — Política de crédito",
    criterios: [
      { key: "cumpleEndeudamiento", nombre: "Cumple Endeudamiento" },
      { key: "cumpleSolvencia", nombre: "Cumple Solvencia" },
      { key: "cumpleDisponible", nombre: "Cumple Disponible" },
      { key: "cumpleDesprotegido", nombre: "Cumple Desprotegido" },
      { key: "cumple4Criterios", nombre: "Cumplimiento 4 Criterios" },
    ],
  },
] as const

// Pasos del flujo. Cada uno corresponde a una tabla con su request/response.
export const PASOS = [
  { id: "validate", label: "Validate", tabla: "valida1_results" },
  { id: "motor-data", label: "Motor Data", tabla: "motor_data_results" },
  {
    id: "motor-process",
    label: "Motor Process",
    tabla: "motor_process_results",
  },
  { id: "identidad", label: "Identidad", tabla: "identity_validations" },
] as const

export type CampoKey = (typeof SECCIONES)[number]["campos"][number]["key"]
export type CriterioKey = (typeof GRUPOS)[number]["criterios"][number]["key"]
export type PasoId = (typeof PASOS)[number]["id"]

/**
 * Lo minimo para pintar una tarjeta de la bandeja. La lista solo carga esto:
 * los JSON de los motores pesan cientos de KB por solicitud y solo hacen
 * falta al abrir el detalle.
 */
export type SolicitudResumen = {
  radicado: string
  nombre: string
  cedula: string
  monto: string
  fecha: string
  estado: SolicitudEstado
}

/** Quien reviso la solicitud, cuando y con que observacion. */
export type Gestion = {
  por: string
  fecha: string
  nota: string | null
}

/** Solicitud completa: se consulta al abrir una del listado. */
export type Solicitud = SolicitudResumen & {
  gestion: Gestion | null
  campos: Record<CampoKey, string>
  criterios: Record<CriterioKey, boolean>
  motivos: string[]
  // request_json / response_json tal cual salen de cada servicio.
  payloads?: Partial<
    Record<PasoId, Partial<Record<"request" | "response", unknown>>>
  >
}

/** Una pagina de la bandeja. */
export type PaginaSolicitudes = {
  solicitudes: SolicitudResumen[]
  total: number
  pagina: number
  totalPaginas: number
}

export const POR_PAGINA = 20
