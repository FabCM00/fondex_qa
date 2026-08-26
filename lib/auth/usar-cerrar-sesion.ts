"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { signOut } from "@/lib/auth/cliente"

/**
 * Cierre de sesion unico para toda la app: invalida el token en la base
 * (Better Auth borra la fila de session), limpia la cookie y manda al login.
 */
export function useCerrarSesion() {
  const router = useRouter()
  const [cerrando, setCerrando] = React.useState(false)

  const cerrarSesion = React.useCallback(async () => {
    if (cerrando) return
    setCerrando(true)

    try {
      await signOut()
    } finally {
      // Aunque falle la llamada, se sale: la cookie ya no sirve de nada.
      router.replace("/login?session=closed")
      router.refresh()
    }
  }, [cerrando, router])

  return { cerrarSesion, cerrando }
}
