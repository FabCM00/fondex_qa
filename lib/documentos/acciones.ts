"use server"

import { exigirSesion } from "@/lib/auth/sesion"
import { prisma } from "@/lib/prisma"
import {
  cambiarEstadoDocumento,
  DocumentoError,
  eliminarDocumento,
  listarDocumentos,
  listarTiposUsados,
  subirDocumento,
  urlDocumento,
} from "@/lib/documentos/repo"
import {
  ESTADOS_MANUALES,
  esDocumentoEstado,
  type DocumentoEstado,
} from "@/lib/documentos/schema"
import {
  enviarAFirma,
  sincronizarFirma,
  type Firmante,
} from "@/lib/documentos/zapsign"

/**
 * Un mensaje presentable en vez de una excepcion cruda. Lo inesperado se
 * registra en el servidor: sin eso, un fallo de Azure o de Prisma llega a la UI
 * como "error inesperado" y no queda rastro de la causa.
 */
function comoMensaje(error: unknown): string {
  if (error instanceof DocumentoError) return error.message

  console.error("[documentos]", error)

  // En desarrollo se muestra la causa real: es lo que hace falta para arreglarla.
  return process.env.NODE_ENV === "production"
    ? "Ocurrió un error inesperado. Intenta de nuevo."
    : `Error: ${(error as Error)?.message ?? String(error)}`
}

export async function cargarDocumentos(radicado: string) {
  await exigirSesion("/dashboard")
  return listarDocumentos(radicado)
}

export async function cargarTipos(radicado: string) {
  await exigirSesion("/dashboard")
  return listarTiposUsados(radicado)
}

/**
 * Sube uno o varios archivos bajo el mismo tipo. Se procesan de a uno para
 * poder decir cual fallo, en vez de abortar el lote completo.
 */
export async function subirDocumentos(datos: FormData) {
  const usuario = await exigirSesion("/dashboard")

  const radicado = String(datos.get("radicado") ?? "")
  const tipo = String(datos.get("tipo") ?? "")
  const archivos = datos.getAll("archivos").filter((v) => v instanceof File)

  if (!radicado) {
    return { ok: false as const, mensaje: "Falta el radicado." }
  }
  if (archivos.length === 0) {
    return { ok: false as const, mensaje: "No seleccionaste ningún archivo." }
  }

  // La cedula sale de la solicitud: la tabla la guarda para poder buscar los
  // documentos de una persona sin pasar por valida1_results.
  const solicitud = await prisma.valida1_results.findUnique({
    where: { radicado },
    select: { cedula: true },
  })

  if (!solicitud) {
    return { ok: false as const, mensaje: "La solicitud no existe." }
  }

  const fallos: string[] = []
  let subidos = 0

  for (const archivo of archivos) {
    try {
      await subirDocumento({
        radicado,
        cedula: solicitud.cedula ?? "",
        archivo,
        tipoDocumento: tipo,
        subidoPor: usuario.email,
      })
      subidos++
    } catch (error) {
      fallos.push(comoMensaje(error))
    }
  }

  if (subidos === 0) {
    return { ok: false as const, mensaje: fallos[0] ?? "No se pudo subir." }
  }

  return {
    ok: true as const,
    mensaje: fallos.length
      ? `${subidos} de ${archivos.length} subidos. ${fallos[0]}`
      : `${subidos} documento${subidos === 1 ? "" : "s"} subido${subidos === 1 ? "" : "s"}.`,
  }
}

export async function actualizarEstado(id: string, estado: string) {
  await exigirSesion("/dashboard")

  if (!esDocumentoEstado(estado) || !ESTADOS_MANUALES.includes(estado)) {
    return { ok: false as const, mensaje: "Ese estado no se puede asignar." }
  }

  try {
    await cambiarEstadoDocumento(id, estado as DocumentoEstado)
    return { ok: true as const, mensaje: "Estado actualizado." }
  } catch (error) {
    return { ok: false as const, mensaje: comoMensaje(error) }
  }
}

export async function borrarDocumento(id: string) {
  await exigirSesion("/dashboard")

  try {
    await eliminarDocumento(id)
    return { ok: true as const, mensaje: "Documento eliminado." }
  } catch (error) {
    return { ok: false as const, mensaje: comoMensaje(error) }
  }
}

/** Enlace temporal para abrir o descargar. Caduca en minutos. */
export async function obtenerEnlace(id: string) {
  await exigirSesion("/dashboard")

  try {
    return { ok: true as const, url: await urlDocumento(id) }
  } catch (error) {
    return { ok: false as const, mensaje: comoMensaje(error) }
  }
}

/**
 * Manda a firma. El primero de `documentoIds` es el principal; si hay mas, van
 * como anexos del mismo sobre y se firman con un solo enlace.
 */
export async function enviarDocumentosAFirma({
  radicado,
  documentoIds,
  firmante,
}: {
  radicado: string
  documentoIds: string[]
  firmante: Firmante
}) {
  const usuario = await exigirSesion("/dashboard")

  try {
    const resultado = await enviarAFirma({
      documentoIds,
      radicado,
      firmante,
      enviadoPor: usuario.email,
    })

    return {
      ok: true as const,
      mensaje:
        resultado.total === 1
          ? `Documento enviado a ${firmante.email}.`
          : `${resultado.total} documentos enviados a ${firmante.email} en un solo enlace.`,
      signUrl: resultado.signUrl,
    }
  } catch (error) {
    return { ok: false as const, mensaje: comoMensaje(error) }
  }
}

/**
 * Consulta a ZapSign como quedo un sobre y aplica el resultado. Es la salida
 * cuando el webhook no llego (URL de ngrok vencida, despliegue a la hora justa)
 * y el documento quedo atascado en `pendiente_firma`.
 */
export async function sincronizarEstadoFirma(documentoId: string) {
  await exigirSesion("/dashboard")

  const firma = await prisma.firma_solicitudes.findFirst({
    where: { documento_id: BigInt(documentoId) },
    orderBy: { created_at: "desc" },
    select: { zapsign_token: true },
  })

  if (!firma) {
    return { ok: false as const, mensaje: "Este documento no se envió a firma." }
  }

  try {
    const resultado = await sincronizarFirma(firma.zapsign_token)
    return resultado.ok
      ? { ok: true as const, mensaje: resultado.mensaje }
      : { ok: false as const, mensaje: resultado.mensaje }
  } catch (error) {
    return { ok: false as const, mensaje: comoMensaje(error) }
  }
}

/**
 * Los datos del firmante que ya conocemos, para precargar el formulario. Salen
 * de la ficha del asociado que devolvio Valida 1.
 */
export async function datosFirmante(radicado: string) {
  await exigirSesion("/dashboard")

  const fila = await prisma.valida1_results.findUnique({
    where: { radicado },
    select: { response_json: true, cedula: true },
  })

  const raiz =
    fila?.response_json && typeof fila.response_json === "object"
      ? (fila.response_json as Record<string, unknown>)
      : {}
  const asociado =
    raiz.datos_asociado && typeof raiz.datos_asociado === "object"
      ? (raiz.datos_asociado as Record<string, unknown>)
      : {}

  const partes = [
    asociado.nombre,
    asociado.primer_apellido,
    asociado.segundo_apellido,
  ]
    .map((parte) => (typeof parte === "string" ? parte.trim() : ""))
    .filter(Boolean)

  return {
    nombre: partes.join(" "),
    email: typeof asociado.email === "string" ? asociado.email : "",
  }
}
