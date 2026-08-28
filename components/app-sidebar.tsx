"use client"

import * as React from "react"
import Image from "next/image"

import { BandejaSolicitudes } from "@/components/bandeja-solicitudes"
import { useDashboard } from "@/components/dashboard-context"
import { NavUser } from "@/components/nav-user"
import { SolicitudesFilter } from "@/components/solicitudes-filter"
import { MARCA } from "@/lib/marca"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { esVistaBandeja as esBandeja, MODULOS_POR_ROL } from "@/lib/navegacion"
import {
  BellIcon,
  CheckCheckIcon,
  ChevronRightIcon,
  ClockIcon,
  FileTextIcon,
  HomeIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

// Los modulos viven en lib/navegacion (sin JSX): aqui resolvemos su icono.
const ICONOS: Record<string, LucideIcon> = {
  Bell: BellIcon,
  CheckCheck: CheckCheckIcon,
  Clock: ClockIcon,
  FileText: FileTextIcon,
  Home: HomeIcon,
  Settings: SettingsIcon,
  ShieldCheck: ShieldCheckIcon,
  SlidersHorizontal: SlidersHorizontalIcon,
  UserRound: UserRoundIcon,
  Users: UsersIcon,
}

function Icono({ nombre }: { nombre: string }) {
  const Componente = ICONOS[nombre] ?? FileTextIcon
  return <Componente />
}

export function AppSidebar({
  conNavegacion = true,
  filtrosOpen,
  onFiltrosOpenChange,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  /** En modo navbar los modulos van arriba: aqui solo queda la bandeja. */
  conNavegacion?: boolean
  filtrosOpen: boolean
  onFiltrosOpenChange: (open: boolean) => void
}) {
  const [modulosAbiertos, setModulosAbiertos] = React.useState<
    Record<string, boolean>
  >({})

  const { usuario, navVisible, vistaActiva, seleccionarVista, bandeja } =
    useDashboard()

  const modulos = MODULOS_POR_ROL[usuario.rol]
  const enBandeja = esBandeja(vistaActiva)

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row *:data-[sidebar=sidebar]:transition-[width] *:data-[sidebar=sidebar]:duration-200 *:data-[sidebar=sidebar]:ease-linear"
      {...props}
    >
      {/* Navegacion por modulos: cada modulo despliega sus vistas.
          Se puede esconder desde el boton del header, y no se monta cuando
          la navegacion vive en la barra superior. */}
      {conNavegacion && (
        <div
          aria-hidden={!navVisible}
          className={`shrink-0 overflow-hidden transition-[width] duration-200 ease-linear ${
            navVisible ? "w-52 border-e" : "pointer-events-none w-0 border-e-0"
          }`}
        >
          <Sidebar collapsible="none" className="w-52">
            <SidebarHeader className="h-12 justify-center border-b p-2">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    size="lg"
                    className="h-8 gap-2 p-0 hover:bg-transparent active:bg-transparent"
                    render={<a href="#" />}
                  >
                    <div className="flex aspect-square size-7 items-center justify-center rounded-lg">
                      <Image
                        src={MARCA.logo}
                        alt={MARCA.nombre}
                        width={28}
                        height={28}
                        className="size-full object-contain"
                      />
                    </div>
                    <div className="grid flex-1 text-start leading-tight">
                      <span className="truncate text-sm font-medium">
                        {MARCA.nombre}
                      </span>
                      <span className="truncate text-[10px] text-muted-foreground">
                        {usuario.rol === "ADMIN"
                          ? "Administrador"
                          : "Negociador"}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup className="p-2 pt-4">
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {modulos.map((modulo, indice) => {
                      // Modulo de una sola vista con su mismo titulo: boton
                      // directo, sin desplegable redundante (ej. Panel).
                      const esVistaUnica =
                        modulo.vistas.length === 1 &&
                        modulo.vistas[0].titulo === modulo.titulo

                      if (esVistaUnica) {
                        return (
                          <SidebarMenuItem key={modulo.titulo}>
                            <SidebarMenuButton
                              isActive={vistaActiva === modulo.titulo}
                              onClick={() => seleccionarVista(modulo.titulo)}
                              render={<button type="button" />}
                              className="h-8 w-full px-2 font-medium data-active:bg-sidebar-primary/10 data-active:text-sidebar-accent-foreground"
                            >
                              <Icono nombre={modulo.icono} />
                              <span className="truncate">{modulo.titulo}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      }

                      return (
                      <SidebarMenuItem key={modulo.titulo}>
                        <Collapsible
                          className="group/collapsible"
                          open={modulosAbiertos[modulo.titulo] ?? indice === 0}
                          onOpenChange={(open) =>
                            setModulosAbiertos((prev) => ({
                              ...prev,
                              [modulo.titulo]: open,
                            }))
                          }
                        >
                          <CollapsibleTrigger
                            render={
                              <SidebarMenuButton className="h-8 w-full px-2 font-medium" />
                            }
                          >
                            <Icono nombre={modulo.icono} />
                            <span className="truncate">{modulo.titulo}</span>
                            <ChevronRightIcon className="ms-auto size-3.5 shrink-0 transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="mx-3 gap-0.5 px-2 py-1">
                              {modulo.vistas.map((vista) => (
                                <SidebarMenuSubItem key={vista.titulo}>
                                  <SidebarMenuSubButton
                                    size="sm"
                                    isActive={vistaActiva === vista.titulo}
                                    onClick={() =>
                                      seleccionarVista(vista.titulo)
                                    }
                                    render={<button type="button" />}
                                    className="relative w-full ps-3 before:absolute before:inset-y-1 before:start-0 before:w-[3px] before:rounded-full before:bg-transparent data-active:bg-sidebar-primary/10 data-active:font-medium data-active:text-sidebar-accent-foreground data-active:before:bg-sidebar-primary"
                                  >
                                    <Icono nombre={vista.icono} />
                                    <span>{vista.titulo}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </Collapsible>
                      </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="gap-2 border-t p-2">
              <NavUser />
              <span className="px-2 text-center text-[10px] text-muted-foreground">
                {MARCA.cooperativa} - {MARCA.version}
              </span>
            </SidebarFooter>
          </Sidebar>
        </div>
      )}

      {enBandeja && (
        <SolicitudesFilter
          open={filtrosOpen}
          onOpenChange={onFiltrosOpenChange}
          estadoFiltro={bandeja.estadoFiltro}
          onEstadoFiltroChange={bandeja.filtrarPorEstado}
          conteos={bandeja.conteos}
        />
      )}

      {enBandeja && (
        <BandejaSolicitudes
          titulo={vistaActiva}
          bandeja={bandeja}
          filtrosOpen={filtrosOpen}
          onFiltrosOpenChange={onFiltrosOpenChange}
        />
      )}
    </Sidebar>
  )
}
