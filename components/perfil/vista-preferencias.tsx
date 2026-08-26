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
  LoaderCircleIcon,
  LogOutIcon,
  ShieldCheckIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNotificaciones } from "@/components/ui/notificaciones"
import { DialogoDosPasos } from "@/components/perfil/dialogo-dos-pasos"
import { twoFactor, useSession } from "@/lib/auth/cliente"

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
  const { cerrarSesion, cerrando } = useCerrarSesion()
  const modoNavegacion = useModoNavegacion()
  const { notificar } = useNotificaciones()
  const { data: sesion } = useSession()

  // El estado real vive en el servidor (User.twoFactorEnabled); la sesion lo
  // trae, asi que no hace falta consultarlo aparte.
  const activoEnServidor =
    (sesion?.user as { twoFactorEnabled?: boolean } | undefined)
      ?.twoFactorEnabled ?? false

  const [dobleFactor, setDobleFactor] = React.useState(activoEnServidor)

  // Al llegar la sesion se sincroniza el switch, sin pisar un cambio que el
  // usuario acabe de hacer en esta pantalla.
  const [previo, setPrevio] = React.useState(activoEnServidor)

  if (activoEnServidor !== previo) {
    setPrevio(activoEnServidor)
    setDobleFactor(activoEnServidor)
  }

  const [activando, setActivando] = React.useState(false)
  const [desactivando, setDesactivando] = React.useState(false)
  const [cambiando2FA, setCambiando2FA] = React.useState(false)
  const [passwordDesactivar, setPasswordDesactivar] = React.useState("")
  const [errorDesactivar, setErrorDesactivar] = React.useState<string | null>(
    null
  )

  /** El switch no cambia nada por si solo: abre el flujo correspondiente. */
  const alternarDosPasos = (activar: boolean) => {
    if (activar) setActivando(true)
    else setDesactivando(true)
  }

  const desactivarDosPasos = async () => {
    setErrorDesactivar(null)
    setCambiando2FA(true)

    const { error } = await twoFactor.disable({ password: passwordDesactivar })

    setCambiando2FA(false)

    if (error) {
      return setErrorDesactivar(
        error.code === "INVALID_PASSWORD"
          ? "La contraseña no es correcta."
          : (error.message ?? "No pudimos desactivar la verificación.")
      )
    }

    setDobleFactor(false)
    setDesactivando(false)
    setPasswordDesactivar("")
    notificar("Verificación en dos pasos desactivada.", "exito")
  }

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
              descripcion="Código de tu app de autenticación al iniciar sesión."
            >
              <Switch
                checked={dobleFactor}
                onCheckedChange={alternarDosPasos}
                disabled={cambiando2FA}
                aria-label="Activar verificación en dos pasos"
              />
            </Fila>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {dobleFactor
              ? "Se te pedirá un código al iniciar sesión con contraseña. Si entras con Microsoft, el segundo factor lo pone Entra ID."
              : "Protege tu cuenta con un código temporal, además de la contraseña."}
          </p>
        </section>

        <DialogoDosPasos
          key={`activar-${activando}`}
          abierto={activando}
          onOpenChange={setActivando}
          onActivado={() => {
            setDobleFactor(true)
            notificar("Verificación en dos pasos activada.", "exito")
          }}
        />

        {/* Desactivar tambien pide la contrasena: si alguien deja la sesion
            abierta, no deberia poder quitarle el segundo factor a la cuenta. */}
        <Dialog
          open={desactivando}
          onOpenChange={(abierto) => {
            setDesactivando(abierto)
            if (!abierto) {
              setPasswordDesactivar("")
              setErrorDesactivar(null)
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Desactivar verificación en dos pasos</DialogTitle>
              <DialogDescription>
                Tu cuenta quedará protegida solo con la contraseña. Confirma
                para continuar.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password-desactivar">Contraseña</Label>
              <Input
                id="password-desactivar"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={passwordDesactivar}
                onChange={(evento) => {
                  setPasswordDesactivar(evento.target.value)
                  setErrorDesactivar(null)
                }}
                aria-invalid={!!errorDesactivar}
              />
              {errorDesactivar && (
                <p className="text-sm font-medium text-destructive">
                  {errorDesactivar}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDesactivando(false)}
                disabled={cambiando2FA}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={desactivarDosPasos}
                disabled={!passwordDesactivar || cambiando2FA}
              >
                {cambiando2FA && (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                )}
                Desactivar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
