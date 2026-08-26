"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"

import { exigirColaborador, listarColaboradores } from "@/lib/admin/usuarios"
import { exigirRol, type UsuarioSesion } from "@/lib/auth/sesion"
import type { Rol } from "@/lib/auth/roles"
import { enviarCorreo, plantillaInvitacion } from "@/lib/correo"
import { prisma } from "@/lib/prisma"

export type Resultado = { ok: boolean; mensaje: string }

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HORAS_INVITACION = 48

/** Toda accion de esta pantalla exige sesion ADMIN vigente. */
async function admin(): Promise<UsuarioSesion> {
  return exigirRol("ADMIN")
}

function refrescar() {
  revalidatePath("/admin")
}

/** Crea el token de invitacion y manda el correo con el enlace. */
async function invitarUno(email: string, rol: Rol): Promise<Resultado> {
  const correo = email.trim().toLowerCase()

  if (!CORREO_VALIDO.test(correo)) {
    return { ok: false, mensaje: `${correo}: correo inválido.` }
  }

  const existente = await prisma.user.findUnique({ where: { email: correo } })
  if (existente) {
    return { ok: false, mensaje: `${correo}: ya tiene cuenta.` }
  }

  const token = randomBytes(32).toString("hex")
  const expira = new Date(Date.now() + HORAS_INVITACION * 60 * 60 * 1000)

  // El usuario nace inactivo y sin contrasena: la crea al aceptar la invitacion.
  await prisma.$transaction([
    prisma.user.create({
      data: {
        name: correo.split("@")[0].replace(/[._-]/g, " "),
        email: correo,
        role: rol,
        active: false,
        emailVerified: false,
      },
    }),
    prisma.verification.create({
      data: { identifier: `invitacion:${correo}`, value: token, expiresAt: expira },
    }),
  ])

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  await enviarCorreo({
    para: correo,
    asunto: "Te invitaron a WANT N' GET",
    html: plantillaInvitacion({
      enlace: `${base}/invitacion/${token}`,
      rol: rol === "ADMIN" ? "Administrador" : "Colaborador",
    }),
  })

  return { ok: true, mensaje: `${correo}: invitación enviada.` }
}

export async function invitarUsuarios(
  correos: string[],
  rol: Rol
): Promise<Resultado> {
  await admin()

  const resultados = await Promise.all(
    correos.map((correo) => invitarUno(correo, rol))
  )
  const enviadas = resultados.filter((r) => r.ok).length
  const fallidas = resultados.filter((r) => !r.ok)

  refrescar()

  if (enviadas === 0) {
    return { ok: false, mensaje: fallidas.map((f) => f.mensaje).join(" ") }
  }

  return {
    ok: true,
    mensaje:
      `Se ${enviadas === 1 ? "envió 1 invitación" : `enviaron ${enviadas} invitaciones`}.` +
      (fallidas.length ? ` Sin enviar: ${fallidas.map((f) => f.mensaje).join(" ")}` : ""),
  }
}

/** Reenvia la invitacion: renueva el token y vuelve a mandar el correo. */
export async function reenviarInvitacion(id: string): Promise<Resultado> {
  await admin()

  try {
    const usuario = await exigirColaborador(id)
    const token = randomBytes(32).toString("hex")
    const expira = new Date(Date.now() + HORAS_INVITACION * 60 * 60 * 1000)

    await prisma.verification.deleteMany({
      where: { identifier: `invitacion:${usuario.email}` },
    })
    await prisma.verification.create({
      data: {
        identifier: `invitacion:${usuario.email}`,
        value: token,
        expiresAt: expira,
      },
    })

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    await enviarCorreo({
      para: usuario.email,
      asunto: "Tu invitación a WANT N' GET",
      html: plantillaInvitacion({
        enlace: `${base}/invitacion/${token}`,
        rol: "Colaborador",
      }),
    })

    return { ok: true, mensaje: `Invitación reenviada a ${usuario.email}.` }
  } catch (error) {
    return { ok: false, mensaje: (error as Error).message }
  }
}

export async function cambiarEstadoUsuario(
  id: string,
  activo: boolean
): Promise<Resultado> {
  await admin()

  try {
    const usuario = await exigirColaborador(id)

    await prisma.user.update({ where: { id }, data: { active: activo } })

    // Al inactivar se cierran sus sesiones: el token deja de servir de una vez.
    if (!activo) {
      await prisma.session.deleteMany({ where: { userId: id } })
    }

    refrescar()
    return {
      ok: true,
      mensaje: `${usuario.email} quedó ${activo ? "activo" : "inactivo"}.`,
    }
  } catch (error) {
    return { ok: false, mensaje: (error as Error).message }
  }
}

export async function eliminarUsuario(id: string): Promise<Resultado> {
  const actual = await admin()

  if (actual.id === id) {
    return { ok: false, mensaje: "No puedes eliminar tu propia cuenta." }
  }

  try {
    const usuario = await exigirColaborador(id)

    // Session y Account caen en cascada por el onDelete del schema.
    await prisma.user.delete({ where: { id } })
    await prisma.verification.deleteMany({
      where: { identifier: `invitacion:${usuario.email}` },
    })

    refrescar()
    return { ok: true, mensaje: `Se eliminó ${usuario.email}.` }
  } catch (error) {
    return { ok: false, mensaje: (error as Error).message }
  }
}

/** Recarga la lista tras una accion. */
export async function recargarUsuarios() {
  await admin()
  return listarColaboradores()
}
