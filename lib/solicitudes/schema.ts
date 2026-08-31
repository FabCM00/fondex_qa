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

// Cada seccion/grupo se marca con el paso del que depende: si ese paso
// todavia no llego para la solicitud (obtenerSolicitud trae null en esa
// relacion), la seccion entera se oculta en vez de mostrarse llena de guiones.
export const SECCIONES = [
  {
    titulo: "Solicitante",
    paso: "validate",
    campos: [
      { key: "nombreCompleto", label: "Nombre" },
      { key: "cedula", label: "Cédula" },
      { key: "celular", label: "Celular" },
      { key: "email", label: "Email" },
    ],
  },
  {
    titulo: "Datos laborales",
    paso: "motor-data",
    campos: [
      { key: "edad", label: "Edad" },
      { key: "antiguedadEficacia", label: "Antigüedad Eficacia" },
      { key: "antiguedadFondo", label: "Antigüedad Fondo" },
      { key: "estadoLaboral", label: "Estado laboral" },
      { key: "tipoContrato", label: "Tipo contrato" },
      { key: "seccion", label: "Sección" },
      { key: "salarioBase", label: "Salario base" },
      { key: "otrosIngresos", label: "Otros ingresos" },
      { key: "creditosVigentes", label: "Créditos vigentes (saldo)" },
      { key: "aportesSociales", label: "Aportes sociales" },
      { key: "segSocial", label: "Seg. Social" },
      { key: "descuentosFondo", label: "Descuentos fondo" },
    ],
  },
  {
    titulo: "Solicitud",
    paso: "motor-process",
    campos: [
      { key: "lineaCredito", label: "Línea de crédito" },
      { key: "montoAprobado", label: "Monto aprobado" },
      { key: "plazo", label: "Plazo" },
      { key: "cuotaMensual", label: "Cuota mensual" },
      { key: "tasaMesVencida", label: "Tasa mes vencida" },
      { key: "tasaEfectivaAnual", label: "Tasa efectiva anual" },
    ],
  },
  {
    titulo: "Análisis financiero",
    paso: "motor-process",
    campos: [
      { key: "egresosTotales", label: "Egresos totales" },
      { key: "egresoFamiliar", label: "Egreso familiar" },
      { key: "solvencia", label: "Solvencia" },
      { key: "capacidadPagoDisponible", label: "Capacidad de pago disponible" },
      { key: "cupoMaximo", label: "Cupo máximo" },
      { key: "disponibleCuota", label: "Disponible (cuota)" },
    ],
  },
  {
    titulo: "Scoring Fondex",
    paso: "motor-process",
    campos: [
      { key: "scoreTotal", label: "Score total" },
      { key: "perfilFondex", label: "Perfil" },
      { key: "puntosEdad", label: "Pts. Edad" },
      { key: "puntosSalario", label: "Pts. Salario" },
      { key: "puntosFondex", label: "Pts. Fondex" },
      { key: "puntosCreditos", label: "Pts. Créditos" },
      { key: "puntosEficacia", label: "Pts. Eficacia" },
      { key: "puntosCaptacion", label: "Pts. Captación" },
    ],
  },
] as const

export const GRUPOS = [
  {
    titulo: "Valida 1 — Criterios del cliente",
    paso: "validate",
    criterios: [
      { key: "resultadoValidacion1", nombre: "Resultado Validación 1" },
      { key: "validaIdentidad", nombre: "Validación Identidad (ID)" },
      { key: "validaEmail", nombre: "Validación Email" },
      { key: "validaCelular", nombre: "Validación Celular" },
      { key: "validaEstadoLaboral", nombre: "Validación Estado Laboral" },
    ],
  },
  {
    titulo: "Identidad — Validación documental y facial",
    paso: "identidad",
    criterios: [
      { key: "estadoDocumento", nombre: "Documento de identidad" },
      { key: "estadoFacial", nombre: "Validación facial (biometría)" },
    ],
  },
  {
    titulo: "Motor de crédito — Viabilidad",
    paso: "motor-process",
    criterios: [
      { key: "viabilidadDefinitiva", nombre: "Viabilidad definitiva" },
      { key: "viabilidadCriterio1", nombre: "Viabilidad criterio 1" },
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
  { id: "identidad", label: "Identidad", tabla: "identity_results" },
  { id: "workflow", label: "Workflow", tabla: "workflow_results" },
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
  /** Que pasos ya llegaron para esta solicitud (tienen fila en su tabla). */
  pasosDisponibles: Record<PasoId, boolean>
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
