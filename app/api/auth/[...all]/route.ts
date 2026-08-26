import { toNextJsHandler } from "better-auth/next-js"

import { auth } from "@/lib/auth/auth"

// Todas las rutas de Better Auth: /api/auth/sign-in/email, /sign-out, etc.
export const { GET, POST } = toNextJsHandler(auth.handler)
