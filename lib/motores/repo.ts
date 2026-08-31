import "server-only"

import { prisma } from "@/lib/prisma"
import {
  aTextoEditable,
  type AjusteMotor,
  type CampoEdicion,
  type CampoFormulario,
  type EntradaCampo,
} from "@/lib/motores/schema"
import { existeRuta, leerRuta } from "@/lib/motores/rutas"

const SELECCION = {
  id: true,
  motor: true,
  campo: true,
  etiqueta: true,
  tipo: true,
  editable: true,
  ayuda: true,
  orden: true,
} as const

type Fila = {
  id: bigint
  motor: string
  campo: string
  etiqueta: string
  tipo: CampoEdicion["tipo"]
  editable: boolean
  ayuda: string | null
  orden: number
}

function aCampo(fila: Fila): CampoEdicion {
  return { ...fila, id: String(fila.id) }
}

export async function listarCampos(motor: string): Promise<CampoEdicion[]> {
  const filas = await prisma.edicionMotor.findMany({
    where: { motor },
    orderBy: [{ orden: "asc" }, { etiqueta: "asc" }],
    select: SELECCION,
  })

  return filas.map(aCampo)
}

export async function construirFormulario(
  motor: string,
  request: unknown
): Promise<CampoFormulario[]> {
  const campos = await listarCampos(motor)

  return campos.map((campo) => ({
    ...campo,
    valor: aTextoEditable(leerRuta(request, campo.campo)),
    presente: existeRuta(request, campo.campo),
  }))
}

export async function crearCampo(entrada: EntradaCampo): Promise<CampoEdicion> {
  const fila = await prisma.edicionMotor.create({
    data: entrada,
    select: SELECCION,
  })

  return aCampo(fila)
}

export async function actualizarCampo(
  id: string,
  entrada: Omit<EntradaCampo, "motor">
): Promise<CampoEdicion> {
  const fila = await prisma.edicionMotor.update({
    where: { id: BigInt(id) },
    data: entrada,
    select: SELECCION,
  })

  return aCampo(fila)
}

export async function eliminarCampo(id: string): Promise<void> {
  await prisma.edicionMotor.delete({ where: { id: BigInt(id) } })
}

const SELECCION_AJUSTE = {
  id: true,
  motor: true,
  clave: true,
  etiqueta: true,
  ayuda: true,
  valor_numero: true,
  orden: true,
} as const

type FilaAjuste = {
  id: bigint
  motor: string
  clave: string
  etiqueta: string
  ayuda: string | null
  valor_numero: number | null
  orden: number
}

function aAjuste(fila: FilaAjuste): AjusteMotor {
  return {
    id: String(fila.id),
    motor: fila.motor,
    clave: fila.clave,
    etiqueta: fila.etiqueta,
    ayuda: fila.ayuda,
    valorNumero: fila.valor_numero,
    orden: fila.orden,
  }
}

export async function listarAjustes(motor: string): Promise<AjusteMotor[]> {
  const filas = await prisma.motorAjuste.findMany({
    where: { motor },
    orderBy: [{ orden: "asc" }, { etiqueta: "asc" }],
    select: SELECCION_AJUSTE,
  })

  return filas.map(aAjuste)
}

export async function guardarAjuste(
  motor: string,
  clave: string,
  valorNumero: number
): Promise<AjusteMotor> {
  const fila = await prisma.motorAjuste.update({
    where: { motor_clave: { motor, clave } },
    data: { valor_numero: valorNumero },
    select: SELECCION_AJUSTE,
  })

  return aAjuste(fila)
}

export async function obtenerRequestVigente(
  radicado: string
): Promise<unknown | null> {
  const fila = await prisma.motor_process_results.findUnique({
    where: { radicado },
    select: { request_json: true },
  })

  return fila ? (fila.request_json ?? null) : null
}

function comoIntentos(valor: unknown): Record<string, number> {
  if (typeof valor !== "object" || valor === null) return {}

  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>).map(([clave, cantidad]) => [
      clave,
      typeof cantidad === "number" ? cantidad : 0,
    ])
  )
}

export async function obtenerIntentosUsados(
  radicado: string
): Promise<Record<string, number>> {
  const fila = await prisma.valida1_results.findUnique({
    where: { radicado },
    select: { intentos_json: true },
  })

  return comoIntentos(fila?.intentos_json)
}

/**
 * Suma 1 al intento de `clave` para `radicado` y devuelve el total ya
 * incrementado. Atomico via SQL: dos clics simultaneos no se pisan porque el
 * incremento pasa por el valor que ya esta en la fila, no por uno leido antes
 * en la aplicacion.
 */
export async function consumirIntento(
  radicado: string,
  clave: string
): Promise<number> {
  const filas = await prisma.$queryRaw<{ intentos_json: Record<string, number> }[]>`
    UPDATE "valida1_results"
    SET "intentos_json" = jsonb_set(
      "intentos_json",
      ARRAY[${clave}]::text[],
      (COALESCE(("intentos_json"->>${clave})::int, 0) + 1)::text::jsonb
    )
    WHERE "radicado" = ${radicado}
    RETURNING "intentos_json"
  `

  const fila = filas[0]
  if (!fila) throw new Error(`No existe la solicitud ${radicado}.`)

  return comoIntentos(fila.intentos_json)[clave] ?? 0
}
