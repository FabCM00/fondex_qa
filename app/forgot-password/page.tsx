import { Suspense } from "react"
import { redirect } from "next/navigation"

import { FormularioOlvide } from "@/components/auth/formulario-olvide"
import { RUTA_INICIAL } from "@/lib/auth/roles"
import { obtenerSesion } from "@/lib/auth/sesion"

export default async function Page() {
  // Con sesion activa no hay nada que recuperar.
  const usuario = await obtenerSesion()
  if (usuario) redirect(RUTA_INICIAL[usuario.rol])

  return (
    <Suspense>
      <FormularioOlvide />
    </Suspense>
  )
}
