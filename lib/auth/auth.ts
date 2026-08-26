import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { twoFactor } from "better-auth/plugins"

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

  /**
   * Entrar con la cuenta corporativa. Solo autentica: si el correo no existe en
   * `User`, el hook de `user.create.before` lo rechaza (no hay registro).
   *
   * Se activa solo cuando estan las credenciales, asi el login sigue
   * funcionando en un entorno que no las tenga.
   */
  socialProviders:
    process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
      ? {
          microsoft: {
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            // "common" acepta cualquier tenant; con MICROSOFT_TENANT_ID se
            // limita al de la organizacion.
            tenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
            // Sin esto Microsoft reusa la sesion del navegador y no deja
            // elegir con que cuenta entrar.
            prompt: "select_account",
          },
        }
      : undefined,

  /**
   * Permite que una cuenta creada con contrasena entre tambien por Microsoft,
   * sin duplicar el usuario.
   *
   * Better Auth lo bloquea por defecto (`account_not_linked`) porque vincular
   * por correo permitiria apropiarse de una cuenta ajena si el proveedor no
   * verifica el correo. Con Entra ID el correo viene verificado por Microsoft,
   * y `trustedProviders` limita la vinculacion a ese unico proveedor.
   */
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["microsoft"],
      // Solo se vincula si el correo es exactamente el mismo.
      allowDifferentEmails: false,
    },
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
   * Los errores del flujo social vuelven al login, no a la pagina de error de
   * Better Auth: sin esto, un correo sin cuenta acaba viendo el JSON crudo del
   * rechazo en el navegador.
   */
  /**
   * Los errores del flujo social vuelven al login, no a la pagina de error de
   * Better Auth: sin esto, un rechazo acaba mostrando el JSON crudo en el
   * navegador.
   *
   * El `error` que agrega Better Auth a la query dice el motivo, y el login lo
   * traduce (ver components/auth/login-form.tsx).
   */
  onAPIError: {
    errorURL: "/login?social=error",
  },

  /**
   * Freno a la fuerza bruta. Sin esto el login acepta intentos ilimitados: una
   * lista de contrasenas comunes contra un correo conocido no encuentra ninguna
   * resistencia.
   *
   * `storage: "database"` en vez de memoria porque con varias instancias cada
   * una llevaria su propio contador, y repartir los intentos entre ellas
   * saltaria el limite.
   */
  rateLimit: {
    window: 60,
    max: 100,
    // Por defecto solo se aplica en produccion; asi tambien frena en dev.
    enabled: true,
    storage: "database",
    modelName: "rateLimit",

    customRules: {
      // Los tres endpoints donde se adivina una credencial.
      "/sign-in/email": { window: 60, max: 5 },
      "/reset-password": { window: 60, max: 5 },
      // Pedir el correo de reset es barato de abusar: sirve para inundar la
      // bandeja de alguien y para averiguar que correos existen.
      "/request-password-reset": { window: 300, max: 3 },
    },
  },

  databaseHooks: {
    /**
     * El sistema no tiene registro: las cuentas las crea un ADMIN. Este hook
     * cierra la puerta de atras que abre el login social.
     *
     * `disableSignUp` solo aplica a email+contrasena; un proveedor social crea
     * el usuario si el correo no existe. Sin esto, cualquiera con una cuenta
     * Microsoft entraria y se crearia su propio acceso.
     */
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

    /**
     * Una cuenta desactivada no puede entrar.
     *
     * Va aqui y no en el middleware porque este hook corre ANTES de crear la
     * sesion: sin esto la contrasena correcta bastaba para iniciar sesion aunque
     * un ADMIN hubiera desactivado la cuenta, y `active` no servia de nada.
     */
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
    /**
     * Segundo factor para el login con contrasena. Quien entra por Microsoft no
     * pasa por aqui: Entra ID ya pone su propio MFA, y pedirlo dos veces
     * molesta sin agregar seguridad.
     *
     * Al verificar se puede marcar `trustDevice`, que recuerda el navegador 30
     * dias: asi no se pide el codigo en cada inicio de sesion.
     */
    twoFactor({
      // El nombre que muestra la app de autenticacion.
      issuer: "WANT N' GET",
      // Nadie activa el 2FA sin demostrar que su app genera codigos validos:
      // sin esto podria quedarse fuera de su propia cuenta.
      skipVerificationOnEnable: false,
      backupCodeOptions: { amount: 10, length: 8 },
    }),

    // Debe ir de ultimo: deja que los Server Actions escriban la cookie.
    nextCookies(),
  ],
} satisfies Parameters<typeof betterAuth>[0]

export const auth = betterAuth(opcionesAuth)

export type Sesion = Awaited<ReturnType<typeof auth.api.getSession>>
