import "server-only"

import { prisma } from "@/lib/prisma"
import type { Rol } from "@/lib/auth/roles"

export type UsuarioAdmin = {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  emailVerificado: boolean
  creado: string
  ultimoAcceso: string | null
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

function aUsuarioAdmin(fila: {
  id: string
  name: string
  email: string
  role: Rol
  active: boolean
  emailVerified: boolean
  createdAt: Date
  sessions: { createdAt: Date }[]
}): UsuarioAdmin {
  return {
    id: fila.id,
    nombre: fila.name,
    email: fila.email,
    rol: fila.role,
    activo: fila.active,
    emailVerificado: fila.emailVerified,
    creado: FORMATO_FECHA.format(fila.createdAt),
    ultimoAcceso: fila.sessions[0]
      ? FORMATO_FECHA.format(fila.sessions[0].createdAt)
      : null,
  }
}

/**
 * Lista los usuarios administrables. Los ADMIN quedan fuera a proposito:
 * desde esta pantalla solo se gestionan colaboradores.
 */
export async function listarColaboradores(): Promise<UsuarioAdmin[]> {
  const filas = await prisma.user.findMany({
    where: { role: "COLABORADOR" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      emailVerified: true,
      createdAt: true,
      sessions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  })

  return filas.map(aUsuarioAdmin)
}

/** Nadie puede tocar a un ADMIN desde esta pantalla. */
export async function exigirColaborador(id: string) {
  const usuario = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  })

  if (!usuario) throw new Error("El usuario no existe.")
  if (usuario.role !== "COLABORADOR") {
    throw new Error("No se puede administrar una cuenta de administrador.")
  }

  return usuario
}
