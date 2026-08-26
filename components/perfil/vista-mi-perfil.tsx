"use client"

import * as React from "react"

import { useDashboard } from "@/components/dashboard-context"
import { Titulo } from "@/components/solicitud/etiqueta"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  cargarMetodosAcceso,
  type MetodoAcceso,
} from "@/lib/auth/metodos"
import { KeyRoundIcon } from "lucide-react"

export function VistaMiPerfil() {
  const { usuario } = useDashboard()

  const [metodos, setMetodos] = React.useState<MetodoAcceso[] | null>(null)

  React.useEffect(() => {
    let vigente = true

    cargarMetodosAcceso().then((filas) => {
      if (vigente) setMetodos(filas)
    })

    return () => {
      vigente = false
    }
  }, [])

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

        {/* Con que puede entrar esta cuenta. Cada fila es un metodo vinculado. */}
        <section>
          <Titulo>Formas de iniciar sesión</Titulo>

          {metodos === null ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <ul className="border-t">
              {metodos.map((metodo) => (
                <li
                  key={metodo.id}
                  className="flex items-center gap-3 border-b px-4 py-3"
                >
                  {metodo.nombre.startsWith("Microsoft") ? (
                    <svg
                      viewBox="0 0 21 21"
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    >
                      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                    </svg>
                  ) : (
                    <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
                  )}

                  <span className="text-sm font-medium">{metodo.nombre}</span>

                  <span className="ms-auto shrink-0 text-xs text-muted-foreground">
                    Desde {metodo.desde}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            Puedes entrar con cualquiera de estas. Para vincular tu cuenta de
            Microsoft, inicia sesión con ella una vez.
          </p>
        </section>
      </div>
    </div>
  )
}
