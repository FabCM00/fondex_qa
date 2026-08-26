import { redirect } from "next/navigation"

import { RUTA_INICIAL } from "@/lib/auth/roles"
import { obtenerSesion } from "@/lib/auth/sesion"

export default async function Page() {
  const usuario = await obtenerSesion()
  redirect(usuario ? RUTA_INICIAL[usuario.rol] : "/login")
}
