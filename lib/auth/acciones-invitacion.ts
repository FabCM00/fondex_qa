"use server"

import { activarInvitacion } from "@/lib/auth/invitacion"

// Publico a proposito: el token es la credencial. Sin token valido no hace nada.
export async function crearContrasena(token: string, password: string) {
  return activarInvitacion(token, password)
}
