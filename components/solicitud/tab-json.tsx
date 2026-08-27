"use client"

import * as React from "react"

import { JsonViewer } from "@/components/json-viewer"
import { DialogoEditarMotor } from "@/components/motores/dialogo-editar-motor"
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
import { MOTOR_POR_DEFECTO } from "@/lib/motores/schema"
import { PASOS, type PasoId, type Solicitud } from "@/lib/solicitudes/schema"
import { CheckIcon, ChevronDownIcon, PencilIcon } from "lucide-react"

type Direccion = "request" | "response"

const DIRECCIONES: { id: Direccion; label: string; columna: string }[] = [
  { id: "request", label: "Request", columna: "request_json" },
  { id: "response", label: "Response", columna: "response_json" },
]

const PASO_EDITABLE: PasoId = MOTOR_POR_DEFECTO

export function TabJson({ solicitud }: { solicitud: Solicitud }) {
  const [paso, setPaso] = React.useState<PasoId>("validate")
  const [direccion, setDireccion] = React.useState<Direccion>("response")
  const [editando, setEditando] = React.useState(false)

  const { notificar } = useNotificaciones()
  const { bandeja, seleccionarSolicitud } = useDashboard()
  const [refrescoHistorial, setRefrescoHistorial] = React.useState(0)

  const payloads = solicitud.payloads ?? {}

  const pasoActual = PASOS.find((item) => item.id === paso)
  const direccionActual = DIRECCIONES.find((item) => item.id === direccion)

  const puedeEditar = paso === PASO_EDITABLE

  const alEjecutar = (mensaje: string) => {
    notificar(mensaje, "exito")
    setRefrescoHistorial((n) => n + 1)
    seleccionarSolicitud(solicitud.radicado)
    bandeja.irAPagina(bandeja.pagina)
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

      <div className="h-[34rem] min-h-0 shrink-0">
        <JsonViewer
          value={payloads[paso]?.[direccion] ?? null}
          etiqueta={`${pasoActual?.tabla} · ${direccionActual?.columna}`}
          acciones={
            puedeEditar ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 px-2.5 text-xs"
                onClick={() => setEditando(true)}
              >
                <PencilIcon className="size-3.5" />
                Editar
              </Button>
            ) : null
          }
        />
      </div>

      <div className="shrink-0 border-t pt-4">
        <HistorialMotor
          radicado={solicitud.radicado}
          refresco={refrescoHistorial}
        />
      </div>

      {editando && (
        <DialogoEditarMotor
          key={solicitud.radicado}
          onOpenChange={setEditando}
          radicado={solicitud.radicado}
          motor={PASO_EDITABLE}
          onEjecutado={alEjecutar}
        />
      )}
    </div>
  )
}
