"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import {
  DashboardContext,
  type DashboardContextValue,
} from "@/components/dashboard-context"
import type { UsuarioSesion } from "@/lib/auth/sesion"
import {
  esVistaBandeja,
  puedeVerVista,
  VISTA_GESTIONADAS,
  VISTA_INICIAL,
} from "@/lib/navegacion"
import { useModoNavegacion } from "@/lib/preferencias"
import { cargarDetalle } from "@/lib/solicitudes/acciones"
import type { PaginaSolicitudes, Solicitud } from "@/lib/solicitudes/schema"
import { useBandeja, type Conteos } from "@/lib/solicitudes/usar-bandeja"
import { SidebarProvider } from "@/components/ui/sidebar"

// Anchos de los paneles del sidebar (px). La lista ocupa el espacio restante,
// asi que el ancho total define cuanto se corre el contenido principal.
const NAV_WIDTH = 208
const LISTA_WIDTH = 300
const FILTROS_WIDTH = 208

export function DashboardShell({
  usuario,
  paginaInicial,
  conteosIniciales,
  children,
}: {
  usuario: UsuarioSesion
  /** Primera pagina ya resuelta en el servidor. */
  paginaInicial: PaginaSolicitudes
  conteosIniciales: Conteos
  children: React.ReactNode
}) {
  const modoNavegacion = useModoNavegacion()
  const conSidebar = modoNavegacion === "sidebar"
  const [navVisible, setNavVisible] = React.useState(true)
  const [vistaActiva, setVistaActiva] = React.useState<string>(
    VISTA_INICIAL[usuario.rol]
  )
  const [filtrosOpen, setFiltrosOpen] = React.useState(false)
  const [solicitudSeleccionada, setSolicitudSeleccionada] =
    React.useState<Solicitud | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = React.useState(false)

  const enBandeja = esVistaBandeja(vistaActiva)

  const categoria =
    vistaActiva === VISTA_GESTIONADAS ? "gestionadas" : "activas"

  // Paginacion, filtros y busqueda: siempre contra el servidor.
  const bandeja = useBandeja({
    paginaInicial,
    conteosIniciales,
    categoria,
  })

  // Fuera de la bandeja no hay lista ni filtros: el sidebar se queda solo con
  // la navegacion y el contenido principal gana todo el ancho.
  const sidebarWidth =
    (conSidebar && navVisible ? NAV_WIDTH : 0) +
    (enBandeja ? LISTA_WIDTH + (filtrosOpen ? FILTROS_WIDTH : 0) : 0)

  const alternarNav = React.useCallback(
    () => setNavVisible((valor) => !valor),
    []
  )

  /**
   * Los JSON de los motores pesan cientos de KB por solicitud: la lista no
   * los trae y aqui se piden solo los de la que se abre.
   */
  const seleccionarSolicitud = React.useCallback(
    async (radicado: string | null) => {
      if (!radicado) {
        setSolicitudSeleccionada(null)
        return
      }

      setCargandoDetalle(true)
      try {
        setSolicitudSeleccionada(await cargarDetalle(radicado))
      } finally {
        setCargandoDetalle(false)
      }
    },
    []
  )

  const seleccionarVista = React.useCallback(
    (vista: string) => {
      // El rol manda: aunque llegue otra vista, no se abre.
      if (!puedeVerVista(usuario.rol, vista)) return

      setVistaActiva(vista)
      if (!esVistaBandeja(vista)) {
        setFiltrosOpen(false)
        setSolicitudSeleccionada(null)
      }
    },
    [usuario.rol]
  )

  const contextValue = React.useMemo<DashboardContextValue>(
    () => ({
      usuario,
      navVisible,
      alternarNav,
      vistaActiva,
      seleccionarVista,
      bandeja,
      solicitudSeleccionada,
      seleccionarSolicitud,
      cargandoDetalle,
    }),
    [
      usuario,
      navVisible,
      alternarNav,
      vistaActiva,
      seleccionarVista,
      bandeja,
      solicitudSeleccionada,
      seleccionarSolicitud,
      cargandoDetalle,
    ]
  )

  return (
    <DashboardContext.Provider value={contextValue}>
      <SidebarProvider
        open
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
          } as React.CSSProperties
        }
      >
        <AppSidebar
          conNavegacion={conSidebar}
          filtrosOpen={filtrosOpen}
          onFiltrosOpenChange={setFiltrosOpen}
        />
        {children}
      </SidebarProvider>
    </DashboardContext.Provider>
  )
}
