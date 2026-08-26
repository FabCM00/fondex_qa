// Roles y a donde puede entrar cada uno. Es la unica fuente de verdad:
// el middleware, los layouts protegidos y la UI leen de aqui.

export const ROLES = ["ADMIN", "COLABORADOR"] as const

export type Rol = (typeof ROLES)[number]

/** Ruta inicial de cada rol despues de iniciar sesion. */
export const RUTA_INICIAL: Record<Rol, string> = {
  ADMIN: "/admin",
  COLABORADOR: "/dashboard",
}

/** Prefijos de ruta y quien puede entrar. El primero que coincide gana. */
const REGLAS: { prefijo: string; roles: Rol[] }[] = [
  { prefijo: "/admin", roles: ["ADMIN"] },
  { prefijo: "/dashboard", roles: ["COLABORADOR"] },
]

/** Rutas que no exigen sesion. */
export const RUTAS_PUBLICAS = [
  "/login",
  // El segundo factor: se llega con la contrasena ya validada pero sin sesion.
  "/verificar",
  "/forgot-password",
  // Se llega desde el correo, sin sesion: el token del enlace es lo que
  // autoriza el cambio.
  "/restablecer",
  "/invitacion",
]

export function esRutaPublica(ruta: string) {
  return RUTAS_PUBLICAS.some(
    (publica) => ruta === publica || ruta.startsWith(`${publica}/`)
  )
}

/** Rutas que exigen sesion pero no un rol en particular. */
export function esRutaProtegida(ruta: string) {
  return REGLAS.some(
    (regla) => ruta === regla.prefijo || ruta.startsWith(`${regla.prefijo}/`)
  )
}

/** El rol puede entrar a la ruta? Si ninguna regla aplica, se permite. */
export function puedeEntrar(rol: Rol, ruta: string) {
  const regla = REGLAS.find(
    (candidata) =>
      ruta === candidata.prefijo || ruta.startsWith(`${candidata.prefijo}/`)
  )
  return regla ? regla.roles.includes(rol) : true
}

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === "string" && (ROLES as readonly string[]).includes(valor)
}
