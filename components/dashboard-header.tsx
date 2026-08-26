"use client"

import { AppNavbar } from "@/components/app-navbar"
import { useDashboard } from "@/components/dashboard-context"
import { MODULOS_POR_ROL } from "@/lib/navegacion"
import { useModoNavegacion } from "@/lib/preferencias"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ArrowLeftIcon, PanelLeftIcon } from "lucide-react"

export function DashboardHeader() {
  const {
    usuario,
    navVisible,
    alternarNav,
    vistaActiva,
    solicitudSeleccionada,
    seleccionarSolicitud,
  } = useDashboard()
  const conNavbar = useModoNavegacion() === "navbar"
  const volver = () => seleccionarSolicitud(null)
  // Modulo al que pertenece la vista activa, segun lo que ve el rol.
  const modulo =
    MODULOS_POR_ROL[usuario.rol].find((candidato) =>
      candidato.vistas.some((vista) => vista.titulo === vistaActiva)
    )?.titulo ?? ""

  return (
    <>
      {/* En modo navbar los modulos van arriba del breadcrumb. */}
      {conNavbar && <AppNavbar />}

      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="-ms-1 md:hidden" />
        {!conNavbar && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="-ms-1 hidden size-7 md:inline-flex"
            aria-label={navVisible ? "Esconder menú" : "Mostrar menú"}
            aria-pressed={navVisible}
            title={navVisible ? "Esconder menú" : "Mostrar menú"}
            onClick={alternarNav}
          >
            <PanelLeftIcon />
          </Button>
        )}
        <Separator
          orientation="vertical"
          className="me-2 data-vertical:h-4 data-vertical:self-auto"
        />

        {!conNavbar && solicitudSeleccionada && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="-ms-1 size-7"
            aria-label="Volver a la lista"
            onClick={volver}
          >
            <ArrowLeftIcon />
          </Button>
        )}

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#">{modulo}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              {solicitudSeleccionada ? (
                <BreadcrumbLink
                  render={<button type="button" onClick={volver} />}
                >
                  {vistaActiva}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{vistaActiva}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {solicitudSeleccionada && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-mono text-xs">
                    {solicitudSeleccionada.radicado}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </header>
    </>
  )
}
