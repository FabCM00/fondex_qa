import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { lastLoginMethod, twoFactor } from "better-auth/plugins"

import { prisma } from "@/lib/prisma"
import { enviarCorreo, plantillaReset } from "@/lib/correo"
import { ROLES } from "@/lib/auth/roles"


export const opcionesAuth = {
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_APP_URL,

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await enviarCorreo({
        para: user.email,
        asunto: "Restablece tu contraseña · WANT N' GET",
        html: plantillaReset({ enlace: url }),
      })
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hora
    revokeSessionsOnPasswordReset: true,
  },

  socialProviders:
    process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
      ? {
        microsoft: {
          clientId: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
          tenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
          prompt: "select_account",
        },
      }
      : undefined,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["microsoft"],
      allowDifferentEmails: false,
    },
  },

  user: {
    additionalFields: {
      role: {
        type: ROLES as unknown as string[],
        defaultValue: "COLABORADOR",
        input: false,
      },
      active: {
        type: "boolean",
        defaultValue: true,
        input: false,
      },
    },
  },
  onAPIError: {
    errorURL: "/login?social=error",
  },
  rateLimit: {
    window: 60,
    max: 100,
    enabled: true,
    storage: "database",
    modelName: "rateLimit",

    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/reset-password": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async () => {
          throw new APIError("FORBIDDEN", {
            message:
              "Este correo no tiene una cuenta. Solicítala a un administrador.",
          })
        },
      },
    },
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

  plugins: [
    twoFactor({
      issuer: "WANT N' GET",
      skipVerificationOnEnable: false,
      backupCodeOptions: { amount: 10, length: 8 },
    }),
    /**
     * Recuerda en una cookie con que entro el usuario la ultima vez, para que
     * /login resalte ese camino. Es solo una ayuda visual: la cookie vive en el
     * navegador y no decide nada de seguridad.
     *
     * Sin `storeInDatabase`: un campo en `user` solo guardaria el ultimo metodo
     * y se sobrescribiria en cada entrada. El historico con fecha, IP y metodo
     * de cada inicio de sesion es trabajo de la tabla de auditoria.
     */
    lastLoginMethod({
      /**
       * El plugin solo escribe la cookie en la respuesta que crea la sesion, y
       * con 2FA activo esa respuesta no es `/sign-in/email` (que devuelve
       * `twoFactorRedirect`) sino la verificacion del segundo factor. Sin este
       * mapeo, quien tiene 2FA nunca dejaria registrado su metodo.
       *
       * Se devuelve "email" porque el segundo factor siempre viene detras de la
       * contrasena; el login con Microsoft entra por `/callback/microsoft`, que
       * el plugin ya resuelve solo.
       */
      customResolveMethod: (ctx) => {
        if (ctx.path?.startsWith("/two-factor/verify")) return "email"

        // Ojo: el plugin usa `??`, asi que devolver null aqui NO delega en su
        // logica por defecto, la anula. Hay que replicar los casos que si
        // usamos: contrasena y el retorno del proveedor social.
        if (ctx.path === "/sign-in/email") return "email"
        if (ctx.path?.startsWith("/callback/")) {
          return ctx.params?.id ?? ctx.path.split("/").pop() ?? null
        }

        return null
      },
    }),
    // nextCookies() va de ultimo: escribe las cookies que dejan los de arriba.
    nextCookies(),
  ],
} satisfies Parameters<typeof betterAuth>[0]

export const auth = betterAuth(opcionesAuth)

export type Sesion = Awaited<ReturnType<typeof auth.api.getSession>>
