"use client"

import { useDashboard } from "@/components/dashboard-context"
import { VistaMiPerfil } from "@/components/perfil/vista-mi-perfil"
import { VistaNotificaciones } from "@/components/perfil/vista-notificaciones"
import { VistaPreferencias } from "@/components/perfil/vista-preferencias"
import { SolicitudDetalle } from "@/components/solicitud-detalle"
import {
  esVistaBandeja,
  VISTA_MI_PERFIL,
  VISTA_NOTIFICACIONES,
  VISTA_PREFERENCIAS,
  VISTA_USUARIOS,
} from "@/lib/navegacion"

export function ContenidoPrincipal({
  vistaUsuarios,
}: {
  // Se recibe ya renderizada desde el layout porque es un Server Component.
  vistaUsuarios: React.ReactNode
}) {
  const { vistaActiva } = useDashboard()

  if (esVistaBandeja(vistaActiva)) {
    return <SolicitudDetalle />
  }

  switch (vistaActiva) {
    case VISTA_USUARIOS:
      return vistaUsuarios
    case VISTA_MI_PERFIL:
      return <VistaMiPerfil />
    case VISTA_NOTIFICACIONES:
      return <VistaNotificaciones />
    case VISTA_PREFERENCIAS:
      return <VistaPreferencias />
    default:
      return null
  }
}
