"use client"

import { useDashboard } from "@/components/dashboard-context"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
} from "@/components/ui/sidebar"
import { EsqueletoLista } from "@/components/solicitud/esqueletos"
import { ESTADO_LABEL, estadoStyles } from "@/lib/solicitudes/schema"
import type { Bandeja } from "@/lib/solicitudes/usar-bandeja"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ListFilterIcon,
  LoaderCircleIcon,
} from "lucide-react"

export function BandejaSolicitudes({
  titulo,
  bandeja,
  filtrosOpen,
  onFiltrosOpenChange,
}: {
  titulo: string
  bandeja: Bandeja
  filtrosOpen: boolean
  onFiltrosOpenChange: (open: boolean) => void
}) {
  const { solicitudSeleccionada, seleccionarSolicitud } = useDashboard()

  return (
    <Sidebar collapsible="none" className="hidden min-w-0 flex-1 md:flex">
      <SidebarHeader className="gap-2 border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{titulo}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            {bandeja.cargando && (
              <LoaderCircleIcon className="size-3 animate-spin" />
            )}
            {bandeja.total}
          </span>
        </div>
        <div className="flex w-full items-center gap-2">
          <SidebarInput
            placeholder="Buscar solicitud..."
            value={bandeja.busqueda}
            onChange={(evento) => bandeja.buscar(evento.target.value)}
          />
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Filtros"
            aria-pressed={filtrosOpen}
            onClick={() => onFiltrosOpenChange(!filtrosOpen)}
          >
            <ListFilterIcon />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="no-scrollbar">
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            {bandeja.cargando && bandeja.solicitudes.length === 0 ? (
              <EsqueletoLista />
            ) : bandeja.solicitudes.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">
                No hay solicitudes que coincidan con la búsqueda o el filtro.
              </p>
            ) : (
              bandeja.solicitudes.map((solicitud) => (
                <button
                  type="button"
                  key={solicitud.radicado}
                  onClick={() => seleccionarSolicitud(solicitud.radicado)}
                  data-active={
                    solicitudSeleccionada?.radicado === solicitud.radicado ||
                    undefined
                  }
                  className="relative flex w-full flex-col items-start gap-1 border-b py-2 pe-3 ps-3.5 text-start text-sm leading-tight whitespace-nowrap before:absolute before:inset-y-1.5 before:start-0 before:w-[3px] before:rounded-full before:bg-transparent last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-active:bg-sidebar-primary/10 data-active:before:bg-sidebar-primary"
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="truncate font-medium">
                      {solicitud.nombre}
                    </span>
                    <span className="ms-auto shrink-0 text-xs">
                      {solicitud.fecha}
                    </span>
                  </div>
                  <span className="w-full truncate text-xs text-muted-foreground">
                    Radicado {solicitud.radicado} · C.C. {solicitud.cedula}
                  </span>
                  <div className="flex w-full items-center gap-2">
                    <span className="truncate font-medium tabular-nums">
                      {solicitud.monto}
                    </span>
                    <span
                      className={`ms-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${estadoStyles[solicitud.estado]}`}
                    >
                      {ESTADO_LABEL[solicitud.estado]}
                    </span>
                  </div>
                </button>
              ))
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Cada salto de pagina consulta solo esas 10 filas en el servidor. */}
      {bandeja.totalPaginas > 1 && (
        <SidebarFooter className="flex-row items-center justify-between gap-2 border-t p-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Página anterior"
            disabled={bandeja.pagina <= 1 || bandeja.cargando}
            onClick={() => bandeja.irAPagina(bandeja.pagina - 1)}
          >
            <ChevronLeftIcon />
          </Button>

          <span className="text-xs text-muted-foreground tabular-nums">
            {bandeja.pagina} de {bandeja.totalPaginas}
          </span>

          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Página siguiente"
            disabled={
              bandeja.pagina >= bandeja.totalPaginas || bandeja.cargando
            }
            onClick={() => bandeja.irAPagina(bandeja.pagina + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
