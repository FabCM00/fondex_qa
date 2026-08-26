"use client"

import * as React from "react"

import type { UsuarioSesion } from "@/lib/auth/sesion"
import type { Solicitud } from "@/lib/solicitudes/schema"
import type { Bandeja } from "@/lib/solicitudes/usar-bandeja"

export type DashboardContextValue = {
  /** Usuario autenticado: de aqui sale el rol que filtra el sidebar. */
  usuario: UsuarioSesion
  navVisible: boolean
  alternarNav: () => void
  vistaActiva: string
  seleccionarVista: (vista: string) => void
  /** Paginacion, filtros y busqueda de la bandeja (consultan al servidor). */
  bandeja: Bandeja
  solicitudSeleccionada: Solicitud | null
  /** Recibe el radicado: los JSON pesados se piden al abrir el detalle. */
  seleccionarSolicitud: (radicado: string | null) => void
  cargandoDetalle: boolean
}

export const DashboardContext =
  React.createContext<DashboardContextValue | null>(null)

export function useDashboard() {
  const context = React.useContext(DashboardContext)
  if (!context) {
    throw new Error("useDashboard debe usarse dentro de <DashboardShell>.")
  }
  return context
}
