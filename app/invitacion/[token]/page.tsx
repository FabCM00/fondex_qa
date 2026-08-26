import Link from "next/link"

import { AuthShell } from "@/components/auth/auth-shell"
import { FormularioInvitacion } from "@/components/auth/formulario-invitacion"
import { Button } from "@/components/ui/button"
import { leerInvitacion } from "@/lib/auth/invitacion"
import { MailXIcon } from "lucide-react"

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invitacion = await leerInvitacion(token)

  if (!invitacion) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-3 text-center">
          <MailXIcon className="size-9 text-primary" />
          <h1 className="text-xl font-semibold">Enlace no válido</h1>
          <p className="text-sm text-muted-foreground">
            La invitación venció, ya fue usada o el enlace está incompleto.
            Pídele a un administrador que te la reenvíe.
          </p>
          {/* nativeButton={false}: el render es un <a>, no un <button>. */}
          <Button
            nativeButton={false}
            render={<Link href="/login" />}
            className="mt-1"
          >
            Ir al inicio de sesión
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <FormularioInvitacion
      token={token}
      email={invitacion.email}
      nombre={invitacion.nombre}
    />
  )
}
