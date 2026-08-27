"use client"

import { createAuthClient } from "better-auth/react"
import {
  lastLoginMethodClient,
  twoFactorClient,
} from "better-auth/client/plugins"

// Cliente de Better Auth para componentes de cliente.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    twoFactorClient({
      /**
       * Cuando el usuario tiene 2FA, el login no crea sesion: Better Auth
       * llama aqui para que la app pida el codigo. Sin esto el inicio de sesion
       * se quedaria a medias sin decir por que.
       */
      twoFactorPage: "/verificar",
    }),
    /**
     * Lee la cookie que deja el plugin del servidor. Solo da acceso al valor:
     * quien decide como pintarlo es /login.
     */
    lastLoginMethodClient(),
  ],
})

export const {
  signIn,
  signOut,
  useSession,
  twoFactor,
  getLastUsedLoginMethod,
} = authClient
