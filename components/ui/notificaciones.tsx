"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  LoaderCircleIcon,
  XIcon,
} from "lucide-react"

export type TipoNotificacion = "exito" | "error" | "info" | "cargando"

export type Notificacion = {
  id: number
  tipo: TipoNotificacion
  mensaje: string
}

type Contexto = {
  /** Muestra una notificacion y devuelve su id (util para reemplazarla). */
  notificar: (mensaje: string, tipo?: TipoNotificacion) => number
  /** Cambia una notificacion existente, p.ej. de "cargando" a "exito". */
  actualizar: (id: number, mensaje: string, tipo: TipoNotificacion) => void
  cerrar: (id: number) => void
}

const NotificacionesContext = React.createContext<Contexto | null>(null)

export function useNotificaciones() {
  const contexto = React.useContext(NotificacionesContext)
  if (!contexto) {
    throw new Error(
      "useNotificaciones debe usarse dentro de <ProveedorNotificaciones>."
    )
  }
  return contexto
}

const DURACION = 4000

const ESTILOS: Record<TipoNotificacion, string> = {
  exito: "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/60",
  error: "border-destructive/40 bg-destructive/10",
  info: "border-primary/40 bg-primary/10",
  cargando: "border-border bg-background",
}

function Icono({ tipo }: { tipo: TipoNotificacion }) {
  if (tipo === "exito")
    return <CircleCheckIcon className="size-4 shrink-0 text-emerald-600" />
  if (tipo === "error")
    return <CircleAlertIcon className="size-4 shrink-0 text-destructive" />
  if (tipo === "cargando")
    return (
      <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-muted-foreground" />
    )
  return <InfoIcon className="size-4 shrink-0 text-primary" />
}

export function ProveedorNotificaciones({
  children,
}: {
  children: React.ReactNode
}) {
  const [items, setItems] = React.useState<Notificacion[]>([])
  const siguienteId = React.useRef(0)
  const temporizadores = React.useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const cerrar = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    const temporizador = temporizadores.current.get(id)
    if (temporizador) {
      clearTimeout(temporizador)
      temporizadores.current.delete(id)
    }
  }, [])

  // Las de "cargando" no se cierran solas: esperan a actualizar().
  const programarCierre = React.useCallback(
    (id: number, tipo: TipoNotificacion) => {
      const anterior = temporizadores.current.get(id)
      if (anterior) clearTimeout(anterior)

      if (tipo === "cargando") return

      temporizadores.current.set(
        id,
        setTimeout(() => cerrar(id), DURACION)
      )
    },
    [cerrar]
  )

  const notificar = React.useCallback(
    (mensaje: string, tipo: TipoNotificacion = "info") => {
      const id = ++siguienteId.current
      setItems((prev) => [...prev, { id, tipo, mensaje }])
      programarCierre(id, tipo)
      return id
    },
    [programarCierre]
  )

  const actualizar = React.useCallback(
    (id: number, mensaje: string, tipo: TipoNotificacion) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, mensaje, tipo } : item))
      )
      programarCierre(id, tipo)
    },
    [programarCierre]
  )

  React.useEffect(() => {
    const pendientes = temporizadores.current
    return () => pendientes.forEach((temporizador) => clearTimeout(temporizador))
  }, [])

  const valor = React.useMemo(
    () => ({ notificar, actualizar, cerrar }),
    [notificar, actualizar, cerrar]
  )

  return (
    <NotificacionesContext.Provider value={valor}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-100 flex flex-col-reverse items-center gap-2 px-4"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border px-3.5 py-2.5 shadow-lg",
              ESTILOS[item.tipo]
            )}
          >
            <Icono tipo={item.tipo} />
            <p className="flex-1 text-sm">{item.mensaje}</p>
            <button
              type="button"
              onClick={() => cerrar(item.id)}
              aria-label="Cerrar notificación"
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </NotificacionesContext.Provider>
  )
}
