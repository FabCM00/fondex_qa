export const SOLICITUD_ESTADOS = [
  "valida_1",
  "no_valida_1",
  "val_identidad",
  "no_val_identidad",
  "fallo_servicios",
  "no_viable",
  "preaprobado",
  "aprobado",
  "contabilizado",
  "revision",
] as const

export type SolicitudEstado = (typeof SOLICITUD_ESTADOS)[number]

export const ESTADO_LABEL: Record<SolicitudEstado, string> = {
  valida_1: "Valida 1",
  no_valida_1: "No Valida 1",
  val_identidad: "Val Identidad",
  no_val_identidad: "No Val Identidad",
  fallo_servicios: "Fallo Servicios",
  no_viable: "No viable",
  preaprobado: "Preaprobado",
  aprobado: "Aprobado",
  contabilizado: "Contabilizado",
  revision: "Revisión",
}

export const ESTADO_STYLES: Record<SolicitudEstado, string> = {
  valida_1: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  no_valida_1: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  val_identidad: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  no_val_identidad: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  fallo_servicios:
    "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  no_viable: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  preaprobado:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  aprobado:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  contabilizado:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  revision: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
}

export const ESTADOS_ACTIVOS: readonly SolicitudEstado[] = [
  "valida_1",
  "val_identidad",
  "no_val_identidad",
  "fallo_servicios",
  "preaprobado",
  "revision",
]

export const ESTADOS_ASIGNABLES: readonly SolicitudEstado[] = [
  "preaprobado",
  "aprobado",
]

export const ESTADOS_TERMINALES: readonly SolicitudEstado[] = [
  "aprobado",
  "contabilizado",
]

export function esSolicitudEstado(valor: unknown): valor is SolicitudEstado {
  return (SOLICITUD_ESTADOS as readonly unknown[]).includes(valor)
}

export function esEstadoAsignable(estado: SolicitudEstado): boolean {
  return ESTADOS_ASIGNABLES.includes(estado)
}

export function esEstadoTerminal(estado: SolicitudEstado): boolean {
  return ESTADOS_TERMINALES.includes(estado)
}

export function parsearEstadoManual(
  valor: string | null | undefined
): SolicitudEstado | null {
  return esSolicitudEstado(valor) ? valor : null
}

export type EntradasEstado = {
  motor1: number | null
  existeIdentidad: boolean
  statusFace: number | null
  statusDocument: number | null
  tipoValidacion: number | null
  existeMotorData: boolean
  motorProcessStatus: string | null
  motor2: number | null
  estado143: string | null
  estadoManual?: SolicitudEstado | null
}

export function derivarEstado(entradas: EntradasEstado): SolicitudEstado {
  if (entradas.estadoManual) return entradas.estadoManual

  if (!entradas.existeIdentidad) {
    return entradas.motor1 === 1 ? "valida_1" : "no_valida_1"
  }

  if (!entradas.existeMotorData) {
    if (
      entradas.statusFace === 1 &&
      ((entradas.tipoValidacion === 1 && entradas.statusDocument === 1) ||
        entradas.tipoValidacion === 2)
    ) {
      return "val_identidad"
    }
    if (entradas.statusDocument === 2 || entradas.statusFace === 2) {
      return "no_val_identidad"
    }
  }

  if (entradas.motorProcessStatus !== null && entradas.motorProcessStatus !== "ok") {
    return "fallo_servicios"
  }

  if (entradas.motor2 === 2) return "no_viable"

  if (entradas.motor2 === 1) {
    if (entradas.estado143 === "E") return "preaprobado"
    if (entradas.estado143 === "A") return "aprobado"
    if (entradas.estado143 === "C") return "contabilizado"
  }

  return "revision"
}
