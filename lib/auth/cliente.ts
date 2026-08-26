"use client"

import { createAuthClient } from "better-auth/react"

// Cliente de Better Auth para componentes de cliente.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

export const { signIn, signOut, useSession } = authClient
