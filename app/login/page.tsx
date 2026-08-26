import { Suspense } from "react"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { RUTA_INICIAL } from "@/lib/auth/roles"
import { obtenerSesion } from "@/lib/auth/sesion"

export default async function Page() {
  // Aqui si se valida la sesion de verdad (contra la DB), no solo la cookie.
  const usuario = await obtenerSesion()
  if (usuario) redirect(RUTA_INICIAL[usuario.rol])

  return (
    // useSearchParams necesita un limite de Suspense para el prerender.
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
