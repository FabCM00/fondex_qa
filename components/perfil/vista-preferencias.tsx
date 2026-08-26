"use client"

import * as React from "react"
import Image from "next/image"
import { useTheme } from "next-themes"

import temaClaroSvg from "@/public/tema-claro.svg"
import temaOscuroSvg from "@/public/tema-oscuro.svg"

import { Titulo } from "@/components/solicitud/etiqueta"
import { useCerrarSesion } from "@/lib/auth/usar-cerrar-sesion"
import {
  guardarModoNavegacion,
  MODOS,
  useModoNavegacion,
} from "@/lib/preferencias"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  CheckIcon,
  KeyRoundIcon,
  LogOutIcon,
  ShieldCheckIcon,
} from "lucide-react"

const TEMAS = [
  {
    id: "light",
    label: "Claro",
    descripcion: "Fondo blanco con acentos amarillos.",
    svg: temaClaroSvg,
    fondo: "bg-muted",
  },
  {
    id: "dark",
    label: "Oscuro",
    descripcion: "Fondo negro con acentos amarillos.",
    svg: temaOscuroSvg,
    fondo: "bg-muted",
  },
] as const

function Fila({
  icono,
  titulo,
  descripcion,
  children,
}: {
  icono: React.ReactNode
  titulo: string
  descripcion: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
      <span className="text-muted-foreground">{icono}</span>
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-medium">{titulo}</span>
        <span className="text-xs text-muted-foreground">{descripcion}</span>
      </div>
      <div className="ms-auto shrink-0">{children}</div>
    </div>
  )
}

export function VistaPreferencias() {
  const { theme, setTheme } = useTheme()
  const [dobleFactor, setDobleFactor] = React.useState(false)
  const { cerrarSesion, cerrando } = useCerrarSesion()
  const modoNavegacion = useModoNavegacion()

  // next-themes solo conoce el tema en el cliente: en el servidor devolvemos
  // false para que el marcado inicial coincida con la hidratacion.
  const montado = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto px-6 py-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <section>
          <Titulo>Apariencia</Titulo>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMAS.map((opcion) => {
              const activo = montado && theme === opcion.id
              return (
                <button
                  key={opcion.id}
                  type="button"
                  onClick={() => setTheme(opcion.id)}
                  aria-pressed={activo}
                  data-active={activo || undefined}
                  className="group relative overflow-hidden rounded-lg border text-start transition-colors hover:border-primary/60 data-active:border-primary data-active:ring-1 data-active:ring-primary"
                >
                  <span
                    className={`flex h-28 items-center justify-center ${opcion.fondo}`}
                  >
                    <Image
                      src={opcion.svg}
                      alt=""
                      aria-hidden="true"
                      unoptimized
                      className="h-20 w-auto"
                    />
                  </span>
                  <span className="flex items-center gap-2 border-t px-3 py-2">
                    <span
                      aria-hidden="true"
                      className="flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors group-data-active:border-primary group-data-active:bg-primary"
                    >
                      <CheckIcon className="size-3 text-primary-foreground opacity-0 transition-opacity group-data-active:opacity-100" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium">
                        {opcion.label}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {opcion.descripcion}
                      </span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setTheme("system")}
            className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Usar el tema del sistema
            {montado && theme === "system" ? " (activo)" : ""}
          </button>
        </section>

        <section>
          <Titulo>Navegación</Titulo>
          <div className="grid gap-3 sm:grid-cols-2">
            {MODOS.map((opcion) => {
              const activo = montado && modoNavegacion === opcion.id
              return (
                <button
                  key={opcion.id}
                  type="button"
                  onClick={() => guardarModoNavegacion(opcion.id)}
                  aria-pressed={activo}
                  data-active={activo || undefined}
                  className="group flex flex-col gap-2 rounded-lg border p-3 text-start transition-colors hover:border-primary/60 data-active:border-primary data-active:ring-1 data-active:ring-primary"
                >
                  {/* Miniatura del layout que representa cada modo. */}
                  <span className="flex h-16 w-full gap-1 overflow-hidden rounded-md border bg-muted/40 p-1">
                    {opcion.id === "sidebar" ? (
                      <>
                        <span className="w-1/4 rounded-sm bg-primary/40" />
                        <span className="flex-1 rounded-sm bg-muted-foreground/15" />
                      </>
                    ) : (
                      <span className="flex w-full flex-col gap-1">
                        <span className="h-2.5 rounded-sm bg-primary/40" />
                        <span className="flex-1 rounded-sm bg-muted-foreground/15" />
                      </span>
                    )}
                  </span>

                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors group-data-active:border-primary group-data-active:bg-primary"
                    >
                      <CheckIcon className="size-3 text-primary-foreground opacity-0 transition-opacity group-data-active:opacity-100" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-medium">
                        {opcion.label}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {opcion.descripcion}
                      </span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <Titulo>Seguridad</Titulo>
          <div className="rounded-lg border">
            <Fila
              icono={<KeyRoundIcon className="size-4" />}
              titulo="Contraseña"
              descripcion="Actualiza tu contraseña de acceso."
            >
              <Button variant="outline" size="sm">
                Cambiar contraseña
              </Button>
            </Fila>
            <Fila
              icono={<ShieldCheckIcon className="size-4" />}
              titulo="Verificación en dos pasos (2FA)"
              descripcion="Código OTP de un solo uso al iniciar sesión."
            >
              <Switch
                checked={dobleFactor}
                onCheckedChange={setDobleFactor}
                aria-label="Activar verificación en dos pasos"
              />
            </Fila>
          </div>
          {dobleFactor && (
            <p className="mt-2 text-xs text-muted-foreground">
              Al guardar se enviará un código OTP a {}
              <span className="font-medium">tu correo corporativo</span> para
              confirmar la activación.
            </p>
          )}
        </section>

        <section>
          <Titulo>Sesión</Titulo>
          <div className="rounded-lg border">
            <Fila
              icono={<LogOutIcon className="size-4" />}
              titulo="Cerrar sesión"
              descripcion="Saldrás de la aplicación en este dispositivo."
            >
              <Button
                variant="destructive"
                size="sm"
                disabled={cerrando}
                onClick={cerrarSesion}
              >
                {cerrando ? "Cerrando sesión..." : "Cerrar sesión"}
              </Button>
            </Fila>
          </div>
        </section>
      </div>
    </div>
  )
}
