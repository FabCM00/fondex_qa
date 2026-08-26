import { Suspense } from "react"

import { FormularioVerificar } from "@/components/auth/formulario-verificar"

export default function Page() {
  // No se valida la sesion: aqui aun no existe. La contrasena ya fue correcta y
  // Better Auth espera el segundo factor para crearla.
  return (
    <Suspense>
      <FormularioVerificar />
    </Suspense>
  )
}
