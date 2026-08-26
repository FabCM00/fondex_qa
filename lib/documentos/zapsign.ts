import "server-only"

import { prisma } from "@/lib/prisma"
import { subirBlob } from "@/lib/blob"
import { contenidoDocumento, DocumentoError } from "@/lib/documentos/repo"
import { MAX_LOTE_FIRMA, MIME_FIRMABLE } from "@/lib/documentos/schema"

/**
 * Firma electronica con ZapSign.
 *
 * Como funciona un sobre con varios documentos (es lo que exige su API):
 *
 *   1. POST /docs/                        -> crea el sobre con el PRINCIPAL.
 *                                            Aqui es donde ZapSign manda el
 *                                            correo al firmante.
 *   2. POST /docs/{token}/upload-extra-doc/ -> un anexo por llamada. Heredan
 *                                            firmante e idioma del principal.
 *   3. El firmante abre UN solo enlace y firma todo el sobre de una vez.
 *   4. El webhook llega con el token del sobre y trae `extra_docs[]`, cada uno
 *      con su propio `signed_file`.
 *
 * Por eso `firma_solicitudes` guarda una fila por documento, todas con el mismo
 * `zapsign_token`: el principal es el que lleva `sign_url`.
 */

const API_URL = process.env.ZAPSIGN_API_URL
const TOKEN = process.env.ZAPSIGN_TOKEN

export const WEBHOOK_SECRET = process.env.ZAPSIGN_WEBHOOK_SECRET ?? ""

type ZapSignSigner = {
  token?: string
  sign_url?: string
}

type ZapSignDoc = {
  token?: string
  open_id?: number
  signed_file?: string
  status?: string
  signers?: ZapSignSigner[]
  extra_docs?: ZapSignDoc[]
  /** Solo lo traen los anexos: apunta al principal de su sobre. */
  parent_doc_token?: string
}

async function zapFetch<T>(
  path: string,
  body?: unknown,
  method: "POST" | "GET" = "POST"
): Promise<T> {
  if (!API_URL || !TOKEN) {
    throw new DocumentoError(
      "ZapSign no está configurado (falta ZAPSIGN_API_URL o ZAPSIGN_TOKEN)."
    )
  }

  const respuesta = await fetch(`${API_URL.replace(/\/+$/, "")}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
    cache: "no-store",
  })

  const texto = await respuesta.text()

  if (!respuesta.ok) {
    // El detalle del error viene en el cuerpo: se propaga recortado para que el
    // colaborador vea la causa real (p. ej. "email inválido").
    throw new DocumentoError(
      `ZapSign respondió ${respuesta.status}: ${texto.slice(0, 300)}`
    )
  }

  try {
    return JSON.parse(texto) as T
  } catch {
    throw new DocumentoError("La respuesta de ZapSign no es JSON válido.")
  }
}

export type Firmante = {
  nombre: string
  email: string
}

/** Un documento ya cargado y validado, listo para crear el sobre. */
type DocParaFirma = {
  id: bigint
  nombre: string
  etag: string | null
  contenido: Buffer
}

/**
 * Valida la seleccion ANTES de crear nada en ZapSign: un sobre a medias (unos
 * documentos creados y otros no) es peor que un error temprano. Conserva el
 * orden recibido, porque el primero es el principal.
 */
async function cargarDocs(
  ids: string[],
  radicado: string
): Promise<DocParaFirma[]> {
  if (ids.length === 0) {
    throw new DocumentoError("Selecciona al menos un documento.")
  }
  if (ids.length > MAX_LOTE_FIRMA) {
    throw new DocumentoError(
      `Máximo ${MAX_LOTE_FIRMA} documentos por envío; seleccionaste ${ids.length}.`
    )
  }

  const filas = await prisma.documentos.findMany({
    where: { id: { in: ids.map(BigInt) }, eliminado: false },
    select: {
      id: true,
      radicado: true,
      nombre_original: true,
      mime_type: true,
      etag: true,
      estado: true,
    },
  })

  const porId = new Map(filas.map((fila) => [fila.id.toString(), fila]))

  const docs: DocParaFirma[] = []

  for (const id of ids) {
    const fila = porId.get(id)

    if (!fila) {
      throw new DocumentoError("Uno de los documentos ya no existe.")
    }
    if (fila.radicado !== radicado) {
      throw new DocumentoError(
        `"${fila.nombre_original}" pertenece a otra solicitud.`
      )
    }
    if (fila.mime_type !== MIME_FIRMABLE) {
      throw new DocumentoError(
        `"${fila.nombre_original}" no es PDF: solo se puede firmar un PDF.`
      )
    }
    if (fila.estado === "pendiente_firma") {
      throw new DocumentoError(
        `"${fila.nombre_original}" ya está esperando firma.`
      )
    }
    if (fila.estado === "firmado") {
      throw new DocumentoError(`"${fila.nombre_original}" ya está firmado.`)
    }

    docs.push({
      id: fila.id,
      nombre: fila.nombre_original,
      etag: fila.etag,
      contenido: await contenidoDocumento(fila.id),
    })
  }

  return docs
}

function payloadDoc(doc: DocParaFirma) {
  return {
    name: doc.nombre.slice(0, 255),
    // Sin el prefijo `data:application/pdf;base64,`: ZapSign lo rechaza.
    base64_pdf: doc.contenido.toString("base64"),
  }
}

/**
 * El firmante. Solo canal correo: la identidad ya se validó antes en el flujo
 * (identity_validations), asi que `assinaturaTela` (firma dibujada en pantalla,
 * sin codigo de verificacion) es suficiente.
 */
function payloadFirmante(firmante: Firmante) {
  return [
    {
      name: firmante.nombre,
      email: firmante.email,
      send_automatic_email: true,
      send_automatic_whatsapp: false,
      auth_mode: "assinaturaTela",
    },
  ]
}

export type ResultadoEnvio = {
  zapsignToken: string
  signUrl: string | null
  total: number
}

/**
 * Envia a firma. Con un solo documento es un sobre simple; con varios, el
 * primero es el principal y el resto entran como anexos del mismo sobre, para
 * que el firmante firme todo con un solo enlace.
 */
export async function enviarAFirma({
  documentoIds,
  radicado,
  firmante,
  enviadoPor,
}: {
  documentoIds: string[]
  radicado: string
  firmante: Firmante
  enviadoPor: string
}): Promise<ResultadoEnvio> {
  if (!firmante.nombre.trim()) {
    throw new DocumentoError("Falta el nombre del firmante.")
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firmante.email.trim())) {
    throw new DocumentoError("El correo del firmante no es válido.")
  }

  const docs = await cargarDocs(documentoIds, radicado)
  const [principal, ...anexos] = docs

  // 1. El sobre nace con el principal. Los anexos entran despues, pero al mismo
  //    sobre, asi que el enlace que ya salio por correo los incluye.
  const creado = await zapFetch<ZapSignDoc>("/docs/", {
    ...payloadDoc(principal),
    lang: "es",
    external_id: radicado,
    signers: payloadFirmante(firmante),
  })

  const zapsignToken = creado.token

  if (!zapsignToken) {
    throw new DocumentoError("ZapSign no devolvió el token del documento.")
  }

  // 2. Un anexo por llamada: asi lo exige su API.
  const tokens = [zapsignToken]

  for (const anexo of anexos) {
    const creadoAnexo = await zapFetch<ZapSignDoc>(
      `/docs/${encodeURIComponent(zapsignToken)}/upload-extra-doc/`,
      payloadDoc(anexo)
    )

    if (!creadoAnexo.token) {
      throw new DocumentoError("ZapSign no devolvió el token de un anexo.")
    }
    tokens.push(creadoAnexo.token)
  }

  const signer = creado.signers?.[0]
  const signUrl = signer?.sign_url ?? null

  // 3. Todo o nada: las filas de firma y el estado de los documentos.
  await prisma.$transaction([
    ...docs.map((doc, indice) =>
      prisma.firma_solicitudes.create({
        data: {
          documento_id: doc.id,
          radicado,
          zapsign_token: tokens[indice],
          zapsign_open_id: indice === 0 ? (creado.open_id ?? null) : null,
          // Solo el principal lleva la URL: los anexos se firman en ese mismo
          // enlace, y es lo que distingue al principal en la UI.
          sign_url: indice === 0 ? signUrl : null,
          signer_token: indice === 0 ? (signer?.token ?? null) : null,
          firmante_nombre: firmante.nombre.trim(),
          firmante_email: firmante.email.trim(),
          canal_email: true,
          canal_whatsapp: false,
          status: "pending",
          // Deja rastro de que existio una version sin firmar: al firmar se
          // sobrescribe el blob con el PDF firmado.
          etag_original: doc.etag,
          enviado_por: enviadoPor,
        },
      })
    ),
    prisma.documentos.updateMany({
      where: { id: { in: docs.map((doc) => doc.id) } },
      data: { estado: "pendiente_firma" },
    }),
  ])

  return { zapsignToken, signUrl, total: docs.length }
}

/**
 * Descarga el PDF firmado y sobrescribe el blob del documento. El firmado
 * reemplaza al original a proposito: es el que tiene valor legal.
 */
async function aplicarFirmado(documentoId: bigint, signedFile: string) {
  const fila = await prisma.documentos.findUnique({
    where: { id: documentoId },
    select: { container: true, blob_name: true },
  })

  if (!fila) return

  const respuesta = await fetch(signedFile, { cache: "no-store" })

  if (!respuesta.ok) {
    throw new DocumentoError(
      `No se pudo descargar el PDF firmado (${respuesta.status}).`
    )
  }

  const contenido = Buffer.from(await respuesta.arrayBuffer())

  const { etag } = await subirBlob({
    container: fila.container,
    nombre: fila.blob_name,
    contenido,
    contentType: MIME_FIRMABLE,
  })

  await prisma.documentos.update({
    where: { id: documentoId },
    data: {
      estado: "firmado",
      etag,
      size_bytes: BigInt(contenido.byteLength),
    },
  })
}

export type PayloadWebhook = {
  token?: string
  status?: string
  signed_file?: string
  extra_docs?: ZapSignDoc[]
  [clave: string]: unknown
}

/**
 * Procesa el webhook de ZapSign. Localiza la fila por `zapsign_token` y, si el
 * sobre quedo firmado, baja cada PDF firmado (el principal y sus anexos) y lo
 * guarda sobre su blob.
 */
export async function procesarWebhook(payload: PayloadWebhook) {
  const token = payload.token

  if (!token) {
    return { ok: false as const, mensaje: "El webhook no trae token." }
  }

  const firma = await prisma.firma_solicitudes.findUnique({
    where: { zapsign_token: token },
    select: { id: true, documento_id: true, radicado: true },
  })

  if (!firma) {
    // Puede ser un sobre de otro entorno apuntando al mismo webhook.
    return { ok: false as const, mensaje: "No hay envío con ese token." }
  }

  const estado = (payload.status ?? "").toLowerCase()

  // Siempre se guarda el payload crudo: es la traza de que llego y que decia.
  await prisma.firma_solicitudes.update({
    where: { id: firma.id },
    data: { webhook_json: payload as never },
  })

  if (estado !== "signed") {
    const nuevo =
      estado === "refused" ? "refused" : estado === "error" ? "error" : "pending"

    await prisma.firma_solicitudes.update({
      where: { id: firma.id },
      data: { status: nuevo },
    })

    return { ok: true as const, mensaje: `Estado actualizado a ${nuevo}.` }
  }

  // El principal.
  if (payload.signed_file) {
    await aplicarFirmado(firma.documento_id, payload.signed_file)
  }

  await prisma.firma_solicitudes.update({
    where: { id: firma.id },
    data: { status: "signed", signed_at: new Date() },
  })

  // Los anexos: cada uno trae su propio signed_file y su propio token, que es
  // el que guardamos al enviarlos.
  for (const anexo of payload.extra_docs ?? []) {
    if (!anexo.token || !anexo.signed_file) continue

    const filaAnexo = await prisma.firma_solicitudes.findUnique({
      where: { zapsign_token: anexo.token },
      select: { id: true, documento_id: true },
    })

    if (!filaAnexo) continue

    await aplicarFirmado(filaAnexo.documento_id, anexo.signed_file)

    await prisma.firma_solicitudes.update({
      where: { id: filaAnexo.id },
      data: { status: "signed", signed_at: new Date() },
    })
  }

  return { ok: true as const, mensaje: "Firma aplicada." }
}

/**
 * Pregunta a ZapSign como quedo un sobre y aplica el resultado, sin esperar el
 * webhook.
 *
 * Hace falta porque el webhook puede no llegar nunca: en desarrollo la URL de
 * ngrok cambia cada reinicio, y en produccion un despliegue o una caida a la
 * hora justa deja el documento en `pendiente_firma` para siempre. Esto es la
 * salida manual de ese estado.
 *
 * Reusa `procesarWebhook` a proposito: un solo camino para aplicar una firma,
 * venga de un webhook o de aqui.
 */
export async function sincronizarFirma(zapsignToken: string) {
  const token = zapsignToken.trim()

  if (!token) {
    return { ok: false as const, mensaje: "Falta el token del envío." }
  }

  const firma = await prisma.firma_solicitudes.findUnique({
    where: { zapsign_token: token },
    select: { id: true },
  })

  if (!firma) {
    return { ok: false as const, mensaje: "No hay envío con ese token." }
  }

  let detalle = await zapFetch<ZapSignDoc>(
    `/docs/${encodeURIComponent(token)}/`,
    undefined,
    "GET"
  )

  // Consultar el token de un anexo devuelve una respuesta corta: el estado del
  // sobre y la lista de anexos solo existen en el principal. Se reconsulta
  // desde ahi para sincronizar el sobre completo, no un archivo suelto.
  if (detalle.parent_doc_token) {
    detalle = await zapFetch<ZapSignDoc>(
      `/docs/${encodeURIComponent(detalle.parent_doc_token)}/`,
      undefined,
      "GET"
    )
  }

  return procesarWebhook({
    token: detalle.token ?? token,
    status: (detalle.status ?? "").toLowerCase(),
    signed_file: detalle.signed_file,
    extra_docs: detalle.extra_docs,
  })
}
