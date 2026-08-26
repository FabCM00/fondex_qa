"use client"

import * as React from "react"
import Image from "next/image"

import bandejaSvg from "@/public/bandeja.svg"

import { useDashboard } from "@/components/dashboard-context"
import { Etiqueta } from "@/components/solicitud/etiqueta"
import { TabDocumentos } from "@/components/solicitud/tab-documentos"
import { TabJson } from "@/components/solicitud/tab-json"
import { TabResumen } from "@/components/solicitud/tab-resumen"
import { DialogoGestionar } from "@/components/solicitud/dialogo-gestionar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotificaciones } from "@/components/ui/notificaciones"
import { marcarGestionada } from "@/lib/solicitudes/acciones"
import { EsqueletoDetalle } from "@/components/solicitud/esqueletos"
import {
  ESTADO_LABEL,
  ESTADOS_ACTIVOS,
  estadoStyles,
} from "@/lib/solicitudes/schema"
import {
  CheckCheckIcon,
    MoreVerticalIcon,
} from "lucide-react"

const PESTANAS = [
  { id: "resumen", label: "Resumen" },
  { id: "json", label: "Datos JSON" },
  { id: "documentos", label: "Documentos" },
] as const

type PestanaId = (typeof PESTANAS)[number]["id"]

export function SolicitudDetalle() {
  const {
    solicitudSeleccionada: solicitud,
    cargandoDetalle,
    bandeja,
    seleccionarSolicitud,
  } = useDashboard()
  const { notificar, actualizar } = useNotificaciones()
  const [gestionando, setGestionando] = React.useState(false)
  const [enviando, setEnviando] = React.useState(false)

  const confirmarGestion = async (nota: string) => {
    if (!solicitud) return

    setEnviando(true)
    const aviso = notificar("Marcando como gestionada...", "cargando")
    const resultado = await marcarGestionada(solicitud.radicado, nota)
    actualizar(aviso, resultado.mensaje, resultado.ok ? "exito" : "error")

    if (resultado.ok) {
      // Sale de Activas: se cierra el detalle y se recarga la lista.
      setGestionando(false)
      seleccionarSolicitud(null)
      bandeja.irAPagina(bandeja.pagina)
    }

    setEnviando(false)
  }
  const [pestana, setPestana] = React.useState<PestanaId>("resumen")

  // Los JSON de los motores se piden al abrir: mientras llegan se pinta la
  // forma del detalle, para que no salte cuando lleguen los datos.
  if (cargandoDetalle && !solicitud) {
    return <EsqueletoDetalle />
  }

  if (!solicitud) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Image
          src={bandejaSvg}
          alt=""
          aria-hidden="true"
          unoptimized
          priority
          className="h-auto w-96 max-w-full"
        />
        <p className="text-sm font-medium">Ninguna solicitud seleccionada</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Elige una solicitud en la bandeja para ver su detalle aquí.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-6 pt-4">
        <div className="flex flex-col gap-1">
          <Etiqueta>Información del solicitante</Etiqueta>
          <h1 className="text-lg font-semibold uppercase">
            {solicitud.nombre}
          </h1>
          <p className="text-xs text-muted-foreground">
            CC {solicitud.cedula}
            <span className="mx-1.5">•</span>
            Radicado {solicitud.radicado}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <Etiqueta>Estado de la solicitud</Etiqueta>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${estadoStyles[solicitud.estado]}`}
            >
              {ESTADO_LABEL[solicitud.estado]}
            </span>
          </div>

          {/* Solo las activas se pueden gestionar. */}
          {ESTADOS_ACTIVOS.includes(solicitud.estado) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-8"
                    aria-label="Acciones de la solicitud"
                  />
                }
              >
                <MoreVerticalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem onClick={() => setGestionando(true)}>
                  <CheckCheckIcon />
                  Marcar gestionada
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <DialogoGestionar
        key={`${solicitud.radicado}-${gestionando}`}
        abierto={gestionando}
        onOpenChange={setGestionando}
        nombre={solicitud.nombre}
        radicado={solicitud.radicado}
        enviando={enviando}
        onConfirmar={confirmarGestion}
      />

      <div
        role="tablist"
        aria-label="Secciones de la solicitud"
        className="mt-3 flex items-center gap-1 border-b px-6"
      >
        {PESTANAS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={pestana === item.id}
            onClick={() => setPestana(item.id)}
            data-active={pestana === item.id || undefined}
            className="relative px-3 py-2 text-sm text-muted-foreground transition-colors after:absolute after:inset-x-2 after:-bottom-px after:h-[2px] after:rounded-full after:bg-transparent hover:text-foreground data-active:font-medium data-active:text-foreground data-active:after:bg-primary"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        className={`no-scrollbar min-h-0 flex-1 px-6 py-5 ${
          pestana === "json" ? "" : "overflow-y-auto"
        }`}
      >
        {pestana === "resumen" && <TabResumen solicitud={solicitud} />}
        {pestana === "json" && <TabJson solicitud={solicitud} />}
        {pestana === "documentos" && (
          // key por radicado: al cambiar de solicitud se reinicia la seleccion
          <TabDocumentos key={solicitud.radicado} solicitud={solicitud} />
        )}
      </div>
    </div>
  )
}
