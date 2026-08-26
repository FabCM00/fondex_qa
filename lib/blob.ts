import "server-only"

import { BlobSASPermissions, BlobServiceClient } from "@azure/storage-blob"

/**
 * Azure Blob Storage. Modulo generico: recibe container + nombre y bytes, y no
 * sabe nada de solicitudes ni de documentos.
 *
 * El nombre del blob es la llave (al estilo `key` de S3): quien lo llama decide
 * como construirlo. Ver lib/documentos/rutas.ts.
 */

const conexion = process.env.AZURE_BLOB_CONNECTION_STRING

let servicio: BlobServiceClient | null = null

function obtenerServicio() {
  if (!conexion) {
    throw new Error("Falta AZURE_BLOB_CONNECTION_STRING en el entorno.")
  }
  servicio ??= BlobServiceClient.fromConnectionString(conexion)
  return servicio
}

/**
 * El contenedor, creandolo si no existe. Sin acceso publico: todo se sirve por
 * la app, que es la que valida la sesion.
 */
async function obtenerContenedor(container: string) {
  const cliente = obtenerServicio().getContainerClient(container)
  await cliente.createIfNotExists()
  return cliente
}

export type BlobSubido = {
  /** Version del blob en Azure: cambia con cada sobrescritura. */
  etag: string | null
  size: number
}

export async function subirBlob({
  container,
  nombre,
  contenido,
  contentType,
}: {
  container: string
  nombre: string
  contenido: Buffer
  contentType?: string | null
}): Promise<BlobSubido> {
  const cliente = await obtenerContenedor(container)
  const blob = cliente.getBlockBlobClient(nombre)

  const resultado = await blob.upload(contenido, contenido.byteLength, {
    blobHTTPHeaders: {
      blobContentType: contentType ?? "application/octet-stream",
    },
  })

  return { etag: resultado.etag ?? null, size: contenido.byteLength }
}

/** Descarga el contenido completo. Se usa para enviar el PDF a firma. */
export async function descargarBlob({
  container,
  nombre,
}: {
  container: string
  nombre: string
}): Promise<Buffer> {
  const cliente = obtenerServicio().getContainerClient(container)
  const blob = cliente.getBlockBlobClient(nombre)

  return blob.downloadToBuffer()
}

/**
 * Enlace temporal de descarga. Se firma con la llave de la cuenta, asi que el
 * contenedor no necesita acceso publico y el enlace caduca solo.
 */
export async function urlTemporalBlob({
  container,
  nombre,
  minutos = 10,
  nombreDescarga,
}: {
  container: string
  nombre: string
  minutos?: number
  /** Nombre con el que el navegador guarda el archivo. */
  nombreDescarga?: string
}): Promise<string> {
  const cliente = obtenerServicio().getContainerClient(container)
  const blob = cliente.getBlockBlobClient(nombre)

  const ahora = new Date()

  return blob.generateSasUrl({
    // Tiene que ser una instancia de BlobSASPermissions: un objeto plano lo
    // rechaza en tiempo de ejecucion ("Invalid permission").
    permissions: BlobSASPermissions.parse("r"),
    // Un minuto de gracia por si los relojes no coinciden.
    startsOn: new Date(ahora.getTime() - 60_000),
    expiresOn: new Date(ahora.getTime() + minutos * 60_000),
    contentDisposition: nombreDescarga
      ? `attachment; filename="${nombreDescarga.replace(/"/g, "")}"`
      : undefined,
  })
}

export async function existeBlob({
  container,
  nombre,
}: {
  container: string
  nombre: string
}): Promise<boolean> {
  const cliente = obtenerServicio().getContainerClient(container)
  return cliente.getBlockBlobClient(nombre).exists()
}
