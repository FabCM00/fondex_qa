/**
 * Estados de un documento.
 *
 * Los tres primeros los pone una persona al revisar; los dos ultimos los pone
 * el sistema cuando el documento entra a firma (ZapSign), y por eso no se
 * ofrecen en el selector de la UI.
 */
export const DOCUMENTO_ESTADOS = [
  "pendiente",
  "revision",
  "validado",
  "pendiente_firma",
  "firmado",
] as const

export type DocumentoEstado = (typeof DOCUMENTO_ESTADOS)[number]

/** Los que un colaborador puede asignar a mano. */
export const ESTADOS_MANUALES: readonly DocumentoEstado[] = [
  "pendiente",
  "revision",
  "validado",
]

export const ESTADO_DOC_LABEL: Record<DocumentoEstado, string> = {
  pendiente: "Pendiente",
  revision: "En revisión",
  validado: "Validado",
  pendiente_firma: "Pendiente de firma",
  firmado: "Firmado",
}

export const ESTADO_DOC_STYLES: Record<DocumentoEstado, string> = {
  pendiente: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  revision: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  validado:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  pendiente_firma:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  firmado:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
}

export function esDocumentoEstado(valor: unknown): valor is DocumentoEstado {
  return (DOCUMENTO_ESTADOS as readonly unknown[]).includes(valor)
}

/**
 * Tipos sugeridos, que en la UI se comportan como carpetas. La columna es texto
 * libre a proposito: si mañana hace falta otro tipo, se escribe y ya, sin
 * migracion.
 */
export const TIPOS_DOCUMENTO = [
  "Documentos generales",
  "Cédula",
  "Pagaré",
  "Desprendible de pago",
  "Certificación laboral",
  "Extractos bancarios",
  "Autorización de descuento",
] as const

export const TIPO_POR_DEFECTO = "Documentos generales"

/** Estados del envio a ZapSign. */
export const FIRMA_ESTADOS = ["pending", "signed", "refused", "error"] as const

export type FirmaEstado = (typeof FIRMA_ESTADOS)[number]

export const FIRMA_LABEL: Record<FirmaEstado, string> = {
  pending: "Pendiente de firma",
  signed: "Firmado",
  refused: "Rechazado",
  error: "Con error",
}

export const FIRMA_STYLES: Record<FirmaEstado, string> = {
  pending:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  signed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  refused: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  error: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
}

/**
 * Tope de documentos por sobre. ZapSign cobra por sobre y cada anexo es una
 * llamada aparte: mas de esto vuelve el envio lento y fragil.
 */
export const MAX_LOTE_FIRMA = 5

/** Lo que se permite subir. */
export const MIME_PERMITIDOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

/** 20 MB: ZapSign rechaza PDFs mucho mas grandes. */
export const MAX_BYTES = 20 * 1024 * 1024

/** Solo se puede firmar un PDF. */
export const MIME_FIRMABLE = "application/pdf"

/** Lo que la UI necesita de un documento. */
export type Documento = {
  id: string
  radicado: string
  nombre: string
  tipo: string
  estado: DocumentoEstado
  /** Formateado, listo para pintar (ej. "1.2 MB"). */
  peso: string
  mimeType: string | null
  /** Se puede mandar a firma: es PDF y no esta firmado. */
  firmable: boolean
  subidoPor: string | null
  /** Formateada, lista para pintar. */
  fecha: string
  /** El envio a firma vigente, si tiene uno. */
  firma: {
    id: string
    estado: FirmaEstado
    firmante: string
    signUrl: string | null
    /** Es el principal del sobre (los anexos cuelgan de el). */
    esPrincipal: boolean
  } | null
}

export function formatearPeso(bytes: number | bigint | null): string {
  if (bytes === null) return "—"
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return "—"
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
