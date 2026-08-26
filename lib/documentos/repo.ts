import "server-only"

import crypto from "node:crypto"

import { descargarBlob, subirBlob, urlTemporalBlob } from "@/lib/blob"
import { prisma } from "@/lib/prisma"
import {
  formatearPeso,
  esDocumentoEstado,
  MAX_BYTES,
  MIME_FIRMABLE,
  MIME_PERMITIDOS,
  TIPO_POR_DEFECTO,
  type Documento,
  type DocumentoEstado,
  type FirmaEstado,
} from "@/lib/documentos/schema"

/** El contenedor por defecto. La columna lo guarda por fila, ver el schema. */
export const CONTAINER = "documentos"

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
})

/** Error con mensaje presentable: la UI lo muestra tal cual. */
export class DocumentoError extends Error {}

/**
 * El nombre del blob. Se agrupa por radicado y se le pone un sufijo aleatorio
 * para que subir dos veces el mismo archivo no sobrescriba el anterior (el
 * unique de la tabla es (container, blob_name)).
 */
function rutaBlob(radicado: string, nombreOriginal: string): string {
  const limpio = nombreOriginal
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.\-]+/g, "_")
    .slice(-80)

  return `${radicado}/${crypto.randomUUID()}-${limpio}`
}

/**
 * Sube un archivo: primero al blob, despues la fila. En ese orden porque un
 * blob sin fila es basura recuperable, pero una fila sin blob es un documento
 * que la UI muestra y no se puede abrir.
 */
export async function subirDocumento({
  radicado,
  cedula,
  archivo,
  tipoDocumento,
  subidoPor,
}: {
  radicado: string
  cedula: string
  archivo: File
  tipoDocumento?: string
  subidoPor: string
}) {
  if (archivo.size === 0) {
    throw new DocumentoError(`"${archivo.name}" está vacío.`)
  }
  if (archivo.size > MAX_BYTES) {
    throw new DocumentoError(
      `"${archivo.name}" pesa ${formatearPeso(archivo.size)}; el máximo es ${formatearPeso(MAX_BYTES)}.`
    )
  }
  if (!(MIME_PERMITIDOS as readonly string[]).includes(archivo.type)) {
    throw new DocumentoError(
      `"${archivo.name}" no es un formato permitido (PDF o imagen).`
    )
  }

  const contenido = Buffer.from(await archivo.arrayBuffer())
  const sha256 = crypto.createHash("sha256").update(contenido).digest("hex")
  const blobName = rutaBlob(radicado, archivo.name)

  const { etag } = await subirBlob({
    container: CONTAINER,
    nombre: blobName,
    contenido,
    contentType: archivo.type,
  })

  const fila = await prisma.documentos.create({
    data: {
      radicado,
      cedula,
      container: CONTAINER,
      blob_name: blobName,
      nombre_original: archivo.name,
      mime_type: archivo.type || null,
      size_bytes: BigInt(contenido.byteLength),
      sha256,
      etag,
      tipo_documento: tipoDocumento?.trim() || TIPO_POR_DEFECTO,
      subido_por: subidoPor,
    },
  })

  return { id: fila.id.toString(), nombre: fila.nombre_original }
}

/**
 * Los documentos vivos de una solicitud, con su envio a firma mas reciente.
 * Nunca trae los eliminados: el borrado es logico.
 */
export async function listarDocumentos(radicado: string): Promise<Documento[]> {
  const filas = await prisma.documentos.findMany({
    where: { radicado, eliminado: false },
    orderBy: [{ tipo_documento: "asc" }, { created_at: "desc" }],
    include: {
      firma_solicitudes: {
        orderBy: { created_at: "desc" },
        take: 1,
      },
    },
  })

  return filas.map((fila) => {
    const firma = fila.firma_solicitudes[0]
    const estado = esDocumentoEstado(fila.estado) ? fila.estado : "pendiente"

    return {
      id: fila.id.toString(),
      radicado: fila.radicado,
      nombre: fila.nombre_original,
      tipo: fila.tipo_documento,
      estado,
      peso: formatearPeso(fila.size_bytes),
      mimeType: fila.mime_type,
      // Solo PDF, y no tiene sentido volver a firmar lo ya firmado.
      firmable: fila.mime_type === MIME_FIRMABLE && estado !== "firmado",
      subidoPor: fila.subido_por,
      fecha: FORMATO_FECHA.format(fila.created_at),
      firma: firma
        ? {
            id: firma.id.toString(),
            estado: firma.status as FirmaEstado,
            firmante: firma.firmante_nombre,
            signUrl: firma.sign_url,
            // El principal es el que dio nombre al sobre: su etag_original
            // quedo guardado al crearlo, los anexos no tienen sign_url propia.
            esPrincipal: firma.sign_url !== null,
          }
        : null,
    }
  })
}

/** Los tipos que ya se usaron en esta solicitud (las "carpetas" existentes). */
export async function listarTiposUsados(radicado: string): Promise<string[]> {
  const filas = await prisma.documentos.groupBy({
    by: ["tipo_documento"],
    where: { radicado, eliminado: false },
    orderBy: { tipo_documento: "asc" },
  })

  return filas.map((fila) => fila.tipo_documento)
}

/**
 * Cambia el estado de un documento. Solo acepta los manuales: `pendiente_firma`
 * y `firmado` los pone el flujo de ZapSign, no una persona.
 *
 * Un documento que ya paso por firma no se puede mover a mano: el archivo que
 * hay en el blob es el PDF firmado, y decir que esta "pendiente" contradiria su
 * contenido. Tampoco se toca mientras espera firma, porque el sobre ya salio.
 */
export async function cambiarEstadoDocumento(
  id: string,
  estado: DocumentoEstado
) {
  const actual = await prisma.documentos.findUnique({
    where: { id: BigInt(id) },
    select: { estado: true, nombre_original: true },
  })

  if (!actual) {
    throw new DocumentoError("El documento no existe.")
  }

  if (actual.estado === "firmado") {
    throw new DocumentoError(
      `"${actual.nombre_original}" ya está firmado: su estado no se puede cambiar.`
    )
  }

  if (actual.estado === "pendiente_firma") {
    throw new DocumentoError(
      `"${actual.nombre_original}" está esperando firma: su estado lo actualiza ZapSign.`
    )
  }

  await prisma.documentos.update({
    where: { id: BigInt(id) },
    data: { estado },
  })
}

/**
 * Borrado logico: la fila y el blob se conservan. Un documento que estuvo en un
 * credito no se destruye, solo deja de listarse.
 */
export async function eliminarDocumento(id: string) {
  await prisma.documentos.update({
    where: { id: BigInt(id) },
    data: { eliminado: true, deleted_at: new Date() },
  })
}

/**
 * Enlace temporal para abrir o descargar. Se genera al momento y caduca solo,
 * asi el contenedor nunca necesita acceso publico.
 */
export async function urlDocumento(id: string): Promise<string> {
  const fila = await prisma.documentos.findUnique({
    where: { id: BigInt(id) },
    select: {
      container: true,
      blob_name: true,
      nombre_original: true,
      eliminado: true,
    },
  })

  if (!fila || fila.eliminado) {
    throw new DocumentoError("El documento no existe.")
  }

  return urlTemporalBlob({
    container: fila.container,
    nombre: fila.blob_name,
    nombreDescarga: fila.nombre_original,
  })
}

/** Los bytes de un documento. Lo usa el envio a firma. */
export async function contenidoDocumento(id: bigint): Promise<Buffer> {
  const fila = await prisma.documentos.findUnique({
    where: { id },
    select: { container: true, blob_name: true },
  })

  if (!fila) throw new DocumentoError("El documento no existe.")

  return descargarBlob({ container: fila.container, nombre: fila.blob_name })
}
