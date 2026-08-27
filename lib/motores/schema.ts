import type { ValorPlano } from "@/lib/motores/rutas"

export const TIPOS_CAMPO = ["TEXTO", "NUMERO", "BOOLEANO"] as const

export type TipoCampo = (typeof TIPOS_CAMPO)[number]

export const TIPO_CAMPO_LABEL: Record<TipoCampo, string> = {
  TEXTO: "Texto",
  NUMERO: "Número",
  BOOLEANO: "Sí / No",
}

export const MOTORES = [
  { id: "motor-process", label: "Motor Process" },
] as const

export type MotorId = (typeof MOTORES)[number]["id"]

export const MOTOR_POR_DEFECTO: MotorId = "motor-process"

export function esMotorId(valor: string): valor is MotorId {
  return MOTORES.some((motor) => motor.id === valor)
}

export function esTipoCampo(valor: string): valor is TipoCampo {
  return (TIPOS_CAMPO as readonly string[]).includes(valor)
}

export type CampoEdicion = {
  id: string
  motor: string
  campo: string
  etiqueta: string
  tipo: TipoCampo
  editable: boolean
  ayuda: string | null
  orden: number
}

export type CampoFormulario = CampoEdicion & {
  valor: ValorPlano
  presente: boolean
}

export type EntradaCampo = {
  motor: string
  campo: string
  etiqueta: string
  tipo: TipoCampo
  editable: boolean
  ayuda: string | null
  orden: number
}

export type Resultado = { ok: boolean; mensaje: string }

export function normalizarValor(
  crudo: unknown,
  tipo: TipoCampo
): ValorPlano | undefined {
  if (crudo === null || crudo === undefined || crudo === "") return null

  if (tipo === "NUMERO") {
    const numero = typeof crudo === "number" ? crudo : Number(String(crudo).replace(",", "."))
    return Number.isFinite(numero) ? numero : undefined
  }

  if (tipo === "BOOLEANO") {
    if (typeof crudo === "boolean") return crudo
    const texto = String(crudo).toLowerCase()
    if (["true", "1", "si", "sí"].includes(texto)) return true
    if (["false", "0", "no"].includes(texto)) return false
    return undefined
  }

  return String(crudo)
}

export function aTextoEditable(valor: unknown): ValorPlano {
  if (valor === null || valor === undefined) return null
  if (typeof valor === "boolean" || typeof valor === "number") return valor
  if (typeof valor === "string") return valor
  return JSON.stringify(valor)
}
