import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth/auth"
import { esRol, puedeEntrar, type Rol } from "@/lib/auth/roles"

export type UsuarioSesion = {
  id: string
  nombre: string
  email: string
  imagen: string | null
  rol: Rol
}

/** Lee la sesion desde la cookie. null si no hay o el rol es invalido. */
export async function obtenerSesion(): Promise<UsuarioSesion | null> {
  const sesion = await auth.api.getSession({ headers: await headers() })
  if (!sesion?.user) return null

  const rol = (sesion.user as { role?: unknown }).role
  if (!esRol(rol)) return null

  return {
    id: sesion.user.id,
    nombre: sesion.user.name,
    email: sesion.user.email,
    imagen: sesion.user.image ?? null,
    rol,
  }
}

/**
 * Control de acceso real (el middleware solo hace el redirect rapido).
 * Usar en cada layout/page protegido y en Server Actions.
 */
export async function exigirSesion(ruta: string): Promise<UsuarioSesion> {
  const usuario = await obtenerSesion()

  if (!usuario) {
    redirect(`/login?session=expired&from=${encodeURIComponent(ruta)}`)
  }

  if (!puedeEntrar(usuario.rol, ruta)) {
    redirect("/sin-permisos")
  }

  return usuario
}

/** Igual que exigirSesion pero para un rol puntual (acciones, no rutas). */
export async function exigirRol(rol: Rol): Promise<UsuarioSesion> {
  const usuario = await obtenerSesion()
  if (!usuario) redirect("/login?session=expired")
  if (usuario.rol !== rol) redirect("/sin-permisos")
  return usuario
}
