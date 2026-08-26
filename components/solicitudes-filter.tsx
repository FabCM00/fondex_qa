"use client"

import {
  ESTADO_LABEL,
  ESTADOS,
  type SolicitudEstado,
} from "@/lib/solicitudes/schema"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { ListFilterIcon, XIcon } from "lucide-react"

export function SolicitudesFilter({
  open,
  onOpenChange,
  estadoFiltro,
  onEstadoFiltroChange,
  conteos,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  estadoFiltro: SolicitudEstado | "Todos"
  onEstadoFiltroChange: (estado: SolicitudEstado | "Todos") => void
  /** Los cuenta la base con un GROUP BY, no la lista en memoria. */
  conteos: Record<SolicitudEstado | "Todos", number>
}) {
  const opciones: {
    label: string
    value: SolicitudEstado | "Todos"
    total: number
  }[] = [
    { label: "Todos", value: "Todos", total: conteos.Todos },
    ...ESTADOS.map((estado) => ({
      label: ESTADO_LABEL[estado],
      value: estado,
      total: conteos[estado] ?? 0,
    })),
  ]

  return (
    // El panel queda siempre montado y anima su ancho con la misma duracion y
    // easing que usa el sidebar, para que abrir/cerrar se sienta continuo.
    <div
      aria-hidden={!open}
      className={`hidden shrink-0 overflow-hidden transition-[width] duration-200 ease-linear md:block ${
        open ? "w-52 border-e" : "pointer-events-none w-0 border-e-0"
      }`}
    >
      <Sidebar collapsible="none" className="w-52">
        <SidebarHeader className="h-12 flex-row items-center justify-between gap-2 border-b px-3 py-0">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <ListFilterIcon className="size-3.5" />
            Filtros
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-6"
            aria-label="Cerrar filtros"
            onClick={() => onOpenChange(false)}
          >
            <XIcon />
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="p-2">
            <div className="flex flex-col gap-0.5">
              <span className="px-2 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                Estado
              </span>
              {opciones.map((opcion) => (
                <button
                  key={opcion.value}
                  type="button"
                  onClick={() => onEstadoFiltroChange(opcion.value)}
                  className={`relative flex h-8 items-center justify-between rounded-md ps-3 pe-2 text-start text-sm transition-colors before:absolute before:inset-y-1 before:start-0 before:w-[3px] before:rounded-full ${
                    estadoFiltro === opcion.value
                      ? "bg-sidebar-primary/10 font-medium text-sidebar-accent-foreground before:bg-sidebar-primary"
                      : "before:bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <span className="truncate">{opcion.label}</span>
                  <span className="ms-2 text-xs tabular-nums opacity-70">
                    {opcion.total}
                  </span>
                </button>
              ))}
            </div>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </div>
  )
}
