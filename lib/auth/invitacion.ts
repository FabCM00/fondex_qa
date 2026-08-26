import "server-only"

import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"

const PREFIJO = "invitacion:"

export type Invitacion = {
  email: string
  nombre: string
  rol: string
}

/**
 * Busca el token de invitacion y devuelve a quien pertenece.
 * null si no existe, ya vencio o el usuario ya tiene contrasena.
 */
export async function leerInvitacion(token: string): Promise<Invitacion | null> {
  const registro = await prisma.verification.findFirst({
    where: { value: token, identifier: { startsWith: PREFIJO } },
  })

  if (!registro || registro.expiresAt < new Date()) return null

  const email = registro.identifier.slice(PREFIJO.length)
  const usuario = await prisma.user.findUnique({
    where: { email },
    include: { accounts: { where: { providerId: "credential" } } },
  })

  if (!usuario) return null

  // Si ya definio contrasena, la invitacion no sirve para nada.
  if (usuario.accounts.some((cuenta) => cuenta.password)) return null

  return { email: usuario.email, nombre: usuario.name, rol: usuario.role }
}

/**
 * Define la contrasena de la invitacion, activa la cuenta y quema el token.
 * Better Auth es quien hashea: se usa su API, nunca escribimos el hash.
 */
export async function activarInvitacion(token: string, password: string) {
  const invitacion = await leerInvitacion(token)
  if (!invitacion) {
    return { ok: false, mensaje: "El enlace no es válido o ya venció." }
  }

  if (password.length < 8) {
    return { ok: false, mensaje: "La contraseña debe tener al menos 8 caracteres." }
  }

  const ctx = await auth.$context
  const hash = await ctx.password.hash(password)

  const usuario = await prisma.user.findUnique({
    where: { email: invitacion.email },
    select: { id: true },
  })

  if (!usuario) {
    return { ok: false, mensaje: "El usuario ya no existe." }
  }

  await prisma.$transaction([
    // Cuenta de credenciales con el hash que genero Better Auth.
    prisma.account.upsert({
      where: {
        providerId_accountId: {
          providerId: "credential",
          accountId: usuario.id,
        },
      },
      create: {
        accountId: usuario.id,
        providerId: "credential",
        issuer: "local:credential",
        userId: usuario.id,
        password: hash,
      },
      update: { password: hash },
    }),
    // Queda activa y con el correo verificado (llego al enlace).
    prisma.user.update({
      where: { id: usuario.id },
      data: { active: true, emailVerified: true },
    }),
    // El token es de un solo uso.
    prisma.verification.deleteMany({
      where: { identifier: `${PREFIJO}${invitacion.email}` },
    }),
  ])

  return { ok: true, mensaje: "Contraseña creada.", email: invitacion.email }
}
