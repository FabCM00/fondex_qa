import Link from "next/link"

import { obtenerSesion } from "@/lib/auth/sesion"
import { RUTA_INICIAL } from "@/lib/auth/roles"
import { Button } from "@/components/ui/button"
import { ShieldAlertIcon } from "lucide-react"

export default async function Page() {
  const usuario = await obtenerSesion()
  const destino = usuario ? RUTA_INICIAL[usuario.rol] : "/login"

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldAlertIcon className="size-10 text-primary" />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">No tienes permisos</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tu cuenta
          {usuario ? ` (${usuario.email}, rol ${usuario.rol})` : ""} no tiene
          acceso a esta sección. Si crees que es un error, escríbele a un
          administrador.
        </p>
      </div>
      {/* nativeButton={false}: el render es un <a>, no un <button>. */}
      <Button nativeButton={false} render={<Link href={destino} />}>
        Volver a mi inicio
      </Button>
    </div>
  )
}
