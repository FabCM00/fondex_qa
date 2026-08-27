import "server-only"

import { prisma } from "@/lib/prisma"
import { aTextoEditable, type CampoEdicion, type CampoFormulario, type EntradaCampo } from "@/lib/motores/schema"
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

export async function obtenerRequestVigente(
  radicado: string
): Promise<unknown | null> {
  const fila = await prisma.motor_process_results.findUnique({
    where: { radicado },
    select: { request_json: true },
  })

  return fila ? (fila.request_json ?? null) : null
}
