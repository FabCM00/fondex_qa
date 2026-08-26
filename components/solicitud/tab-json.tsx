"use client"

import * as React from "react"

import { JsonViewer } from "@/components/json-viewer"
import { HistorialMotor } from "@/components/solicitud/historial-motor"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotificaciones } from "@/components/ui/notificaciones"
import { useDashboard } from "@/components/dashboard-context"
import { reejecutarMotorProcess } from "@/lib/solicitudes/acciones"
import { PASOS, type PasoId, type Solicitud } from "@/lib/solicitudes/schema"
import {
  CheckIcon,
  ChevronDownIcon,
  LoaderCircleIcon,
  PlayIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
} from "lucide-react"

/** Cada paso guarda lo que se envio y lo que respondio el servicio. */
type Direccion = "request" | "response"

const DIRECCIONES: { id: Direccion; label: string; columna: string }[] = [
  { id: "request", label: "Request", columna: "request_json" },
  { id: "response", label: "Response", columna: "response_json" },
]

/**
 * Que se puede reejecutar desde aqui. Por ahora solo motor-process: es el paso
 * que recalcula la decision a partir de un payload que ya existe, sin volver a
 * llamar a los servicios externos (Coopvalili, TransUnion) como haria
 * motor-data. Los demas pasos se ven pero no se editan.
 */
const PASO_EJECUTABLE: PasoId = "motor-process"

export function TabJson({ solicitud }: { solicitud: Solicitud }) {
  const [paso, setPaso] = React.useState<PasoId>("validate")
  const [direccion, setDireccion] = React.useState<Direccion>("response")

  const { notificar, actualizar } = useNotificaciones()
  const { bandeja, seleccionarSolicitud } = useDashboard()
  // Sube tras cada ejecucion para que el historial se vuelva a consultar.
  const [refrescoHistorial, setRefrescoHistorial] = React.useState(0)

  const payloads = solicitud.payloads ?? {}

  const pasoActual = PASOS.find((item) => item.id === paso)
  const direccionActual = DIRECCIONES.find((item) => item.id === direccion)

  const original = payloads[paso]?.[direccion] ?? null

  // Solo el request de motor-process se edita: es lo que se le vuelve a mandar
  // al motor.
  const editable = paso === PASO_EJECUTABLE && direccion === "request"

  // El texto en edicion. `null` = sin tocar, se muestra el payload de la base.
  const [borrador, setBorrador] = React.useState<string | null>(null)
  const [ejecutando, setEjecutando] = React.useState(false)

  // Al cambiar de solicitud, de paso o de direccion se descarta el borrador:
  // el editor pasa a mostrar otro payload. Se reinicia durante el render (lo
  // que React recomienda) en vez de con un efecto que llame a setState.
  const clave = `${solicitud.radicado}|${paso}|${direccion}`
  const [clavePrevia, setClavePrevia] = React.useState(clave)

  if (clave !== clavePrevia) {
    setClavePrevia(clave)
    setBorrador(null)
  }

  const textoOriginal = React.useMemo(
    () => JSON.stringify(original, null, 2),
    [original]
  )

  const modificado = borrador !== null && borrador !== textoOriginal

  // Con el JSON roto no se deja ejecutar: el motor recibiria basura.
  const errorJson = React.useMemo(() => {
    if (borrador === null) return null
    try {
      JSON.parse(borrador)
      return null
    } catch (error) {
      return (error as Error).message
    }
  }, [borrador])

  const puedeEjecutar = modificado && !errorJson && !ejecutando

  const ejecutar = async () => {
    if (!puedeEjecutar || borrador === null) return

    setEjecutando(true)
    const aviso = notificar("Ejecutando el motor...", "cargando")

    const resultado = await reejecutarMotorProcess(
      solicitud.radicado,
      JSON.parse(borrador)
    )

    actualizar(aviso, resultado.mensaje, resultado.ok ? "exito" : "error")

    if (resultado.ok) {
      // El detalle se recarga para que el response nuevo (y el estado que se
      // deriva de el) reemplacen lo que hay en pantalla.
      setBorrador(null)
      setRefrescoHistorial((n) => n + 1)
      seleccionarSolicitud(solicitud.radicado)
      bandeja.irAPagina(bandeja.pagina)
    }

    setEjecutando(false)
  }

  return (
    <div className="no-scrollbar flex h-full flex-col gap-3 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-1">
        {PASOS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPaso(item.id)}
            data-active={paso === item.id || undefined}
            title={item.tabla}
            className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-active:border-primary data-active:bg-primary/10 data-active:font-medium data-active:text-foreground"
          >
            {item.label}
          </button>
        ))}

        {/* Desplegable para alternar entre lo enviado y lo recibido. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="ms-auto flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground data-open:bg-accent"
              />
            }
          >
            {direccionActual?.label}
            <ChevronDownIcon className="size-3.5 text-muted-foreground transition-transform duration-200 in-data-open:rotate-180" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="min-w-40">
            {DIRECCIONES.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => setDireccion(item.id)}
              >
                <CheckIcon
                  className={direccion === item.id ? "" : "opacity-0"}
                />
                <span className="flex flex-col">
                  {item.label}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {item.columna}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Aviso de que este payload se puede editar y reejecutar. */}
      {editable && !modificado && (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Puedes editar este payload y volver a ejecutar el motor. Al cambiar
          algo se habilita el botón.
        </p>
      )}

      {/* El JSON quedo invalido: se dice donde, y ejecutar sigue bloqueado. */}
      {errorJson && (
        <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
          <span>
            El JSON no es válido: {errorJson}
          </span>
        </p>
      )}

      {/* Altura fija: el editor no debe encogerse cuando el historial crece. */}
      <div className="h-[34rem] min-h-0 shrink-0">
        <JsonViewer
          value={borrador ?? original}
          etiqueta={`${pasoActual?.tabla} · ${direccionActual?.columna}`}
          onChange={editable ? setBorrador : undefined}
          acciones={
            editable && modificado ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => setBorrador(null)}
                  disabled={ejecutando}
                >
                  <RotateCcwIcon className="size-3.5" />
                  Descartar
                </Button>
                <Button
                  size="sm"
                  className="h-7 gap-1.5 px-2.5 text-xs"
                  onClick={ejecutar}
                  disabled={!puedeEjecutar}
                >
                  {ejecutando ? (
                    <LoaderCircleIcon className="size-3.5 animate-spin" />
                  ) : (
                    <PlayIcon className="size-3.5" />
                  )}
                  {ejecutando ? "Ejecutando..." : "Ejecutar motor"}
                </Button>
              </>
            ) : null
          }
        />
      </div>

      {/* El historial vive bajo el editor: quien edita un payload ve ahi mismo
          que se cambio antes y quien lo hizo. El editor conserva una altura
          minima para que no lo aplaste una lista larga. */}
      <div className="shrink-0 border-t pt-4">
        <HistorialMotor
          radicado={solicitud.radicado}
          refresco={refrescoHistorial}
        />
      </div>
    </div>
  )
}
