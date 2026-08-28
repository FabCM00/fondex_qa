"use client"

import * as React from "react"
import Image from "next/image"

import docsSvg from "@/public/docs.svg"
import firmaSvg from "@/public/firma.svg"

import { DialogoFirma } from "@/components/solicitud/dialogo-firma"
import { DialogoSubirDocumento } from "@/components/solicitud/dialogo-subir-documento"
import { Titulo } from "@/components/solicitud/etiqueta"
import { Button } from "@/components/ui/button"
import { DialogoConfirmar } from "@/components/ui/dialogo-confirmar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotificaciones } from "@/components/ui/notificaciones"
import { Skeleton } from "@/components/ui/skeleton"
import {
  actualizarEstado,
  borrarDocumento,
  cargarDocumentos,
  cargarTipos,
  datosFirmante,
  enviarDocumentosAFirma,
  obtenerEnlace,
  sincronizarEstadoFirma,
  subirDocumentos,
} from "@/lib/documentos/acciones"
import {
  ESTADO_DOC_LABEL,
  ESTADO_DOC_STYLES,
  ESTADOS_MANUALES,
  FIRMA_LABEL,
  FIRMA_STYLES,
  MAX_LOTE_FIRMA,
  type Documento,
} from "@/lib/documentos/schema"
import type { Solicitud } from "@/lib/solicitudes/schema"
import {
  CheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  MoreVerticalIcon,
  PenLineIcon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"

/**
 * El estado se puede cambiar a mano? No, una vez el documento entro al flujo de
 * firma: desde ahi lo maneja ZapSign. El servidor lo rechaza igual (ver
 * cambiarEstadoDocumento), esto solo evita ofrecer lo que va a fallar.
 */
const editable = (documento: Documento) =>
  documento.estado !== "firmado" && documento.estado !== "pendiente_firma"

/** Los documentos agrupados por tipo: el tipo funciona como carpeta. */
function agrupar(documentos: Documento[]) {
  const grupos = new Map<string, Documento[]>()

  for (const documento of documentos) {
    const actual = grupos.get(documento.tipo) ?? []
    actual.push(documento)
    grupos.set(documento.tipo, actual)
  }

  return [...grupos.entries()]
}

export function TabDocumentos({ solicitud }: { solicitud: Solicitud }) {
  const { notificar, actualizar } = useNotificaciones()

  const [documentos, setDocumentos] = React.useState<Documento[] | null>(null)
  const [tipos, setTipos] = React.useState<string[]>([])
  const [refresco, setRefresco] = React.useState(0)

  // La seleccion es un arreglo, no un Set: el ORDEN importa, el primero es el
  // documento principal del sobre de firma.
  const [seleccion, setSeleccion] = React.useState<string[]>([])

  const [subiendo, setSubiendo] = React.useState(false)
  const [abrirSubir, setAbrirSubir] = React.useState(false)

  const [enviandoFirma, setEnviandoFirma] = React.useState(false)
  const [abrirFirma, setAbrirFirma] = React.useState(false)
  const [firmante, setFirmante] = React.useState({ nombre: "", email: "" })

  const [sincronizando, setSincronizando] = React.useState(false)
  const [porBorrar, setPorBorrar] = React.useState<Documento | null>(null)

  // Al cambiar de solicitud se descarta lo que hubiera en pantalla. Se hace en
  // el render (no en un efecto) para no provocar un segundo render en cascada.
  const [radicadoPrevio, setRadicadoPrevio] = React.useState(solicitud.radicado)

  if (solicitud.radicado !== radicadoPrevio) {
    setRadicadoPrevio(solicitud.radicado)
    setDocumentos(null)
    setSeleccion([])
  }

  React.useEffect(() => {
    let vigente = true

    Promise.all([
      cargarDocumentos(solicitud.radicado),
      cargarTipos(solicitud.radicado),
      datosFirmante(solicitud.radicado),
    ]).then(([filas, tiposUsados, datos]) => {
      if (!vigente) return
      setDocumentos(filas)
      setTipos(tiposUsados)
      setFirmante(datos)
    })

    return () => {
      vigente = false
    }
  }, [solicitud.radicado, refresco])

  const recargar = () => setRefresco((n) => n + 1)

  const alternar = (id: string) =>
    setSeleccion((previa) =>
      previa.includes(id)
        ? previa.filter((otro) => otro !== id)
        : [...previa, id]
    )

  const subir = async ({
    tipo,
    archivos,
  }: {
    tipo: string
    archivos: File[]
  }) => {
    setSubiendo(true)
    const aviso = notificar("Subiendo documentos...", "cargando")

    const datos = new FormData()
    datos.set("radicado", solicitud.radicado)
    datos.set("tipo", tipo)
    for (const archivo of archivos) datos.append("archivos", archivo)

    const resultado = await subirDocumentos(datos)
    actualizar(aviso, resultado.mensaje, resultado.ok ? "exito" : "error")

    setSubiendo(false)

    if (resultado.ok) {
      setAbrirSubir(false)
      recargar()
    }
  }

  const abrir = async (documento: Documento) => {
    const resultado = await obtenerEnlace(documento.id)

    if (!resultado.ok) {
      return notificar(resultado.mensaje, "error")
    }
    // El enlace es temporal y caduca solo: se abre en otra pestaña.
    window.open(resultado.url, "_blank", "noopener,noreferrer")
  }

  const cambiarEstado = async (documento: Documento, estado: string) => {
    const resultado = await actualizarEstado(documento.id, estado)
    notificar(resultado.mensaje, resultado.ok ? "exito" : "error")
    if (resultado.ok) recargar()
  }

  const confirmarBorrado = async () => {
    if (!porBorrar) return

    const resultado = await borrarDocumento(porBorrar.id)
    notificar(resultado.mensaje, resultado.ok ? "exito" : "error")
    setPorBorrar(null)

    if (resultado.ok) {
      setSeleccion((previa) => previa.filter((id) => id !== porBorrar.id))
      recargar()
    }
  }

  const enviarFirma = async (datos: { nombre: string; email: string }) => {
    setEnviandoFirma(true)
    const aviso = notificar("Enviando a firma...", "cargando")

    const resultado = await enviarDocumentosAFirma({
      radicado: solicitud.radicado,
      documentoIds: seleccion,
      firmante: datos,
    })

    actualizar(aviso, resultado.mensaje, resultado.ok ? "exito" : "error")
    setEnviandoFirma(false)

    if (resultado.ok) {
      setAbrirFirma(false)
      setSeleccion([])
      recargar()
    }
  }

  // Solo los firmables entran a la seleccion; el orden se conserva.
  const seleccionados = React.useMemo(
    () =>
      seleccion
        .map((id) => documentos?.find((documento) => documento.id === id))
        .filter((documento): documento is Documento => !!documento),
    [seleccion, documentos]
  )

  const enFirma = (documentos ?? []).filter((documento) => documento.firma)

  // Los que siguen esperando: son los que vale la pena reconsultar. Solo se
  // pregunta por el principal de cada sobre, que es el que ZapSign conoce
  // completo (consultar un anexo devuelve una respuesta corta).
  const pendientes = enFirma.filter(
    (documento) =>
      documento.firma!.estado === "pending" && documento.firma!.esPrincipal
  )

  const sincronizar = async () => {
    setSincronizando(true)
    const aviso = notificar("Consultando a ZapSign...", "cargando")

    const resultados = await Promise.all(
      pendientes.map((documento) => sincronizarEstadoFirma(documento.id))
    )

    const fallo = resultados.find((resultado) => !resultado.ok)

    actualizar(
      aviso,
      fallo?.mensaje ?? "Estados actualizados.",
      fallo ? "error" : "exito"
    )

    setSincronizando(false)
    recargar()
  }

  if (documentos === null) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Documentos ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Titulo>Documentos ({documentos.length})</Titulo>

          <div className="flex items-center gap-2">
            {seleccion.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground">
                  {seleccion.length} de {MAX_LOTE_FIRMA} máx.
                </span>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setAbrirFirma(true)}
                  disabled={seleccion.length > MAX_LOTE_FIRMA}
                >
                  <PenLineIcon className="size-3.5" />
                  Enviar a firma
                </Button>
              </>
            )}
            <Button
              variant={seleccion.length > 0 ? "outline" : "default"}
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setAbrirSubir(true)}
            >
              <UploadIcon className="size-3.5" />
              Subir documento
            </Button>
          </div>
        </div>

        {documentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <Image
              src={docsSvg}
              alt=""
              aria-hidden="true"
              unoptimized
              className="h-auto w-72 max-w-full"
            />
            <p className="text-sm font-medium">Sin documentos cargados</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Sube los documentos de la solicitud {solicitud.radicado} para
              revisarlos o enviarlos a firma.
            </p>
          </div>
        ) : (
          // Agrupados por tipo: cada tipo es una carpeta.
          agrupar(documentos).map(([tipo, delTipo]) => (
            <div key={tipo} className="flex flex-col gap-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                {tipo} ({delTipo.length})
              </p>

              <ul className="rounded-lg border">
                {delTipo.map((documento) => {
                  const marcado = seleccion.includes(documento.id)
                  const orden = seleccion.indexOf(documento.id)

                  return (
                    <li
                      key={documento.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 last:border-b-0"
                    >
                      {/* Solo se puede seleccionar lo firmable (PDF sin firmar). */}
                      {documento.firmable ? (
                        <label className="flex shrink-0 items-center">
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={() => alternar(documento.id)}
                            className="size-3.5 accent-primary"
                            aria-label={`Seleccionar ${documento.nombre}`}
                          />
                        </label>
                      ) : (
                        <span className="size-3.5 shrink-0" />
                      )}

                      <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />

                      <span className="truncate text-sm">
                        {documento.nombre}
                      </span>

                      {/* El primero de la seleccion es el principal del sobre. */}
                      {marcado && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {orden === 0 ? "Principal" : `Anexo ${orden}`}
                        </span>
                      )}

                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${ESTADO_DOC_STYLES[documento.estado]}`}
                      >
                        {ESTADO_DOC_LABEL[documento.estado]}
                      </span>

                      <span className="ms-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                        {documento.peso}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-7 shrink-0"
                              aria-label={`Acciones de ${documento.nombre}`}
                            />
                          }
                        >
                          <MoreVerticalIcon className="size-3.5" />
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="min-w-44">
                          <DropdownMenuItem onClick={() => abrir(documento)}>
                            <DownloadIcon />
                            Abrir o descargar
                          </DropdownMenuItem>

                          {/* Los estados de firma los pone el sistema, y lo
                              que ya paso por firma no se mueve a mano: el blob
                              tiene el PDF firmado. */}
                          {editable(documento) &&
                            ESTADOS_MANUALES.map((estado) => (
                              <DropdownMenuItem
                                key={estado}
                                onClick={() => cambiarEstado(documento, estado)}
                              >
                                <CheckIcon
                                  className={
                                    documento.estado === estado
                                      ? ""
                                      : "opacity-0"
                                  }
                                />
                                {ESTADO_DOC_LABEL[estado]}
                              </DropdownMenuItem>
                            ))}

                          {/* Lo firmado tampoco se elimina: es el respaldo del
                              credito. */}
                          {documento.estado !== "firmado" && (
                            <DropdownMenuItem
                              onClick={() => setPorBorrar(documento)}
                            >
                              <Trash2Icon />
                              Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))
        )}
      </section>

      {/* ── Firma ──────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3 border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Titulo>Firma electrónica</Titulo>

          {/* Salida cuando el webhook de ZapSign no llego y el documento quedo
              atascado en "pendiente de firma". */}
          {pendientes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={sincronizar}
              disabled={sincronizando}
            >
              <RefreshCwIcon
                className={`size-3.5 ${sincronizando ? "animate-spin" : ""}`}
              />
              {sincronizando ? "Consultando..." : "Actualizar estado"}
            </Button>
          )}
        </div>

        {enFirma.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <p className="text-sm font-medium">Sin documentos en firma</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Selecciona uno o varios documentos arriba y usa &ldquo;Enviar a
              firma&rdquo;.
            </p>
          </div>
        ) : (
          <ul className="rounded-lg border">
            {enFirma.map((documento) => (
              <li
                key={documento.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 last:border-b-0"
              >
                <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />

                <span className="truncate text-sm">{documento.nombre}</span>

                {documento.firma?.esPrincipal === false && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    Anexo
                  </span>
                )}

                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${FIRMA_STYLES[documento.firma!.estado]}`}
                >
                  {FIRMA_LABEL[documento.firma!.estado]}
                </span>

                <span className="truncate text-xs text-muted-foreground">
                  {documento.firma!.firmante}
                </span>

                {/* Solo el principal tiene enlace: los anexos se firman ahi. */}
                {documento.firma!.signUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ms-auto h-7 gap-1.5 px-2 text-[11px]"
                    onClick={() =>
                      window.open(
                        documento.firma!.signUrl!,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    <ExternalLinkIcon className="size-3" />
                    Ver enlace
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <DialogoSubirDocumento
        key={`subir-${abrirSubir}`}
        abierto={abrirSubir}
        onOpenChange={setAbrirSubir}
        radicado={solicitud.radicado}
        tiposUsados={tipos}
        enviando={subiendo}
        onConfirmar={subir}
      />

      <DialogoFirma
        key={`firma-${abrirFirma}`}
        abierto={abrirFirma}
        onOpenChange={setAbrirFirma}
        seleccionados={seleccionados}
        firmanteInicial={firmante}
        enviando={enviandoFirma}
        onConfirmar={enviarFirma}
      />

      <DialogoConfirmar
        abierto={porBorrar !== null}
        onOpenChange={(abierto) => !abierto && setPorBorrar(null)}
        titulo="Eliminar documento"
        descripcion={`"${porBorrar?.nombre}" dejará de aparecer en la solicitud. El archivo se conserva por auditoría.`}
        textoConfirmar="Eliminar"
        onConfirmar={confirmarBorrado}
      />
    </div>
  )
}
