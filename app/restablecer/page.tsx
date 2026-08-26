import { Suspense } from "react"

import { FormularioRestablecer } from "@/components/auth/formulario-restablecer"

export default function Page() {
  // No se valida la sesion: quien llega aqui viene del correo, y el token es
  // lo que autoriza el cambio.
  return (
    // useSearchParams (el token viaja en la query) necesita Suspense.
    <Suspense>
      <FormularioRestablecer />
    </Suspense>
  )
}
