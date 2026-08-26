"use client"

import { useDashboard } from "@/components/dashboard-context"
import { Titulo } from "@/components/solicitud/etiqueta"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function VistaMiPerfil() {
  const { usuario } = useDashboard()

  const campos = [
    { label: "Nombre completo", value: usuario.nombre },
    { label: "Correo corporativo", value: usuario.email },
    { label: "Rol", value: usuario.rol },
    { label: "ID de usuario", value: usuario.id },
  ]

  const iniciales = usuario.nombre
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto px-6 py-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 rounded-xl">
            <AvatarImage src={usuario.imagen ?? ""} alt={usuario.nombre} />
            <AvatarFallback className="rounded-xl bg-primary/15 text-lg font-medium">
              {iniciales}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-semibold">{usuario.nombre}</h1>
            <p className="text-xs text-muted-foreground">
              {usuario.rol}
              <span className="mx-1.5">•</span>
              {usuario.email}
            </p>
          </div>
        </div>

        <section>
          <Titulo>Información básica</Titulo>
          <dl className="grid grid-cols-1 border-s border-t sm:grid-cols-2">
            {campos.map((campo) => (
              <div key={campo.label} className="border-b border-e px-4 py-2.5">
                <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  {campo.label}
                </dt>
                <dd className="truncate text-sm font-medium">{campo.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}
