import type { Rol } from "@/lib/auth/roles"

// Nombres de las vistas del sidebar. Viven aparte para que el sidebar, el
// shell, el header y el contenido principal hablen del mismo identificador.

export const VISTA_ACTIVAS = "Solicitudes Activas"
export const VISTA_GESTIONADAS = "Solicitudes Gestionadas"
export const VISTA_USUARIOS = "Usuarios"
export const VISTA_MI_PERFIL = "Mi perfil"
export const VISTA_NOTIFICACIONES = "Notificaciones"
export const VISTA_PREFERENCIAS = "Preferencias"

export const VISTAS_BANDEJA: string[] = [VISTA_ACTIVAS, VISTA_GESTIONADAS]

export function esVistaBandeja(vista: string) {
  return VISTAS_BANDEJA.includes(vista)
}

/** Icono: nombre del icono de lucide que resuelve el sidebar. */
export type Vista = { titulo: string; icono: string }
export type Modulo = { titulo: string; icono: string; vistas: Vista[] }

const MODULO_SOLICITUDES: Modulo = {
  titulo: "Solicitudes",
  icono: "FileText",
  vistas: [
    { titulo: VISTA_ACTIVAS, icono: "Clock" },
    { titulo: VISTA_GESTIONADAS, icono: "CheckCheck" },
  ],
}

const MODULO_ADMINISTRACION: Modulo = {
  titulo: "Administración",
  icono: "ShieldCheck",
  vistas: [{ titulo: VISTA_USUARIOS, icono: "Users" }],
}

const MODULO_PERFIL: Modulo = {
  titulo: "Perfil",
  icono: "UserRound",
  vistas: [
    { titulo: VISTA_MI_PERFIL, icono: "UserRound" },
    { titulo: VISTA_NOTIFICACIONES, icono: "Bell" },
    { titulo: VISTA_PREFERENCIAS, icono: "Settings" },
  ],
}

/** Que modulos ve cada rol. Fuente unica para el sidebar. */
export const MODULOS_POR_ROL: Record<Rol, Modulo[]> = {
  ADMIN: [MODULO_ADMINISTRACION, MODULO_PERFIL],
  COLABORADOR: [MODULO_SOLICITUDES, MODULO_PERFIL],
}

/** Vista inicial de cada rol (la primera de su primer modulo). */
export const VISTA_INICIAL: Record<Rol, string> = {
  ADMIN: VISTA_USUARIOS,
  COLABORADOR: VISTA_ACTIVAS,
}

/** El rol puede abrir esa vista? Evita colarse cambiando el estado. */
export function puedeVerVista(rol: Rol, vista: string) {
  return MODULOS_POR_ROL[rol].some((modulo) =>
    modulo.vistas.some((candidata) => candidata.titulo === vista)
  )
}
