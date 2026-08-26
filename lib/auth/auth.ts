import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"

import { prisma } from "@/lib/prisma"
import { enviarCorreo, plantillaReset } from "@/lib/correo"
import { ROLES } from "@/lib/auth/roles"

/**
 * Opciones base. El seed las reusa habilitando el registro (ver prisma/seed.ts),
 * porque en la app el alta de usuarios la hace un ADMIN, no un formulario.
 */
export const opcionesAuth = {
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_APP_URL,

  emailAndPassword: {
    enabled: true,
    // Sin registro publico: los usuarios los crea un ADMIN.
    disableSignUp: true,
    minPasswordLength: 8,

    /**
     * Recuperacion de contrasena. Better Auth crea el token, lo guarda en
     * `verification` y llama aqui con el enlace ya armado; nosotros solo
     * enviamos el correo.
     */
    sendResetPassword: async ({ user, url }) => {
      await enviarCorreo({
        para: user.email,
        asunto: "Restablece tu contraseña · WANT N' GET",
        html: plantillaReset({ enlace: url }),
      })
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hora

    /**
     * Al cambiar la contrasena se cierran las demas sesiones. Es lo que hace
     * util un reset cuando alguien te robo la cuenta: sin esto la sesion del
     * intruso seguiria viva con la contrasena nueva.
     */
    revokeSessionsOnPasswordReset: true,
  },

  user: {
    additionalFields: {
      role: {
        type: ROLES as unknown as string[],
        defaultValue: "COLABORADOR",
        input: false, // nadie puede mandar su propio rol al registrarse
      },
      active: {
        type: "boolean",
        defaultValue: true,
        input: false,
      },
    },
  },

  /**
   * Una cuenta desactivada no puede entrar.
   *
   * Va aqui y no en el middleware porque este hook corre ANTES de crear la
   * sesion: sin esto la contrasena correcta bastaba para iniciar sesion aunque
   * un ADMIN hubiera desactivado la cuenta, y `active` no servia de nada.
   */
  databaseHooks: {
    session: {
      create: {
        before: async (sesion) => {
          const usuario = await prisma.user.findUnique({
            where: { id: sesion.userId },
            select: { active: true },
          })

          if (!usuario?.active) {
            throw new APIError("FORBIDDEN", {
              message:
                "Tu cuenta está desactivada. Contacta a un administrador.",
            })
          }

          return { data: sesion }
        },
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 8, // 8 horas
    updateAge: 60 * 60, // refresca el token si queda menos de 1 hora
    cookieCache: {
      enabled: true,
      maxAge: 60, // 1 min de cache para no golpear la DB en cada request
    },
  },

  // Debe ir de ultimo: deja que los Server Actions escriban la cookie.
  plugins: [nextCookies()],
} satisfies Parameters<typeof betterAuth>[0]

export const auth = betterAuth(opcionesAuth)

export type Sesion = Awaited<ReturnType<typeof auth.api.getSession>>
