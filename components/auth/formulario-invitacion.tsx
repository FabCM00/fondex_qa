"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { AuthShell } from "@/components/auth/auth-shell"
import { crearContrasena } from "@/lib/auth/acciones-invitacion"
import { signIn } from "@/lib/auth/cliente"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react"

const inputBase =
  "h-12 w-full rounded-[10px] border bg-background ps-11 pe-11 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground"
const inputNormal =
  "border-input focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
const inputError =
  "border-destructive bg-destructive/5 focus-visible:border-destructive focus-visible:ring-3 focus-visible:ring-destructive/20"

const MINIMO = 8

export function FormularioInvitacion({
  token,
  email,
  nombre,
}: {
  token: string
  email: string
  nombre: string
}) {
  const router = useRouter()

  const [password, setPassword] = React.useState("")
  const [confirmacion, setConfirmacion] = React.useState("")
  const [ver, setVer] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [cargando, setCargando] = React.useState(false)

  const reglas = [
    { texto: `Al menos ${MINIMO} caracteres`, cumple: password.length >= MINIMO },
    { texto: "Una letra y un número", cumple: /[a-zA-Z]/.test(password) && /\d/.test(password) },
    {
      texto: "Las dos contraseñas coinciden",
      cumple: password.length > 0 && password === confirmacion,
    },
  ]

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault()

    if (password.length < MINIMO) {
      return setError(`La contraseña debe tener al menos ${MINIMO} caracteres.`)
    }
    if (password !== confirmacion) {
      return setError("Las contraseñas no coinciden.")
    }

    setError(null)
    setCargando(true)

    const resultado = await crearContrasena(token, password)

    if (!resultado.ok) {
      setCargando(false)
      return setError(resultado.mensaje)
    }

    // Queda logueado de una: ya definio su contrasena.
    const { error: errorLogin } = await signIn.email({ email, password })
    setCargando(false)

    if (errorLogin) {
      // La contrasena si quedo creada, solo falló el auto-login.
      return router.replace("/login")
    }

    router.replace("/")
    router.refresh()
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Crea tu contraseña
        </h1>
        <p className="text-base text-muted-foreground">
          Hola{nombre ? ` ${nombre}` : ""}, define una contraseña para entrar a
          WANT N&apos; GET.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={enviar}>
        {/* El correo ya viene en la invitacion: solo se muestra. */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold">Correo electrónico</label>
          <div className="relative">
            <MailIcon className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="email"
              value={email}
              disabled
              readOnly
              className="h-12 w-full rounded-[10px] border border-input bg-muted/50 ps-11 pe-4 text-base text-muted-foreground outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-semibold">
            Contraseña
          </label>
          <div className="relative">
            <ShieldCheckIcon
              className={cn(
                "pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2",
                error ? "text-destructive" : "text-muted-foreground"
              )}
            />
            <input
              id="password"
              type={ver ? "text" : "password"}
              autoFocus
              autoComplete="new-password"
              placeholder="Crea tu contraseña"
              value={password}
              onChange={(evento) => {
                setPassword(evento.target.value)
                setError(null)
              }}
              aria-invalid={!!error}
              className={cn(inputBase, error ? inputError : inputNormal)}
            />
            <button
              type="button"
              onClick={() => setVer((valor) => !valor)}
              className="absolute end-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {ver ? (
                <EyeOffIcon className="size-5" />
              ) : (
                <EyeIcon className="size-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="confirmacion" className="text-sm font-semibold">
            Confirmar contraseña
          </label>
          <div className="relative">
            <ShieldCheckIcon
              className={cn(
                "pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2",
                error ? "text-destructive" : "text-muted-foreground"
              )}
            />
            <input
              id="confirmacion"
              type={ver ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repite tu contraseña"
              value={confirmacion}
              onChange={(evento) => {
                setConfirmacion(evento.target.value)
                setError(null)
              }}
              aria-invalid={!!error}
              className={cn(inputBase, error ? inputError : inputNormal)}
            />
          </div>
        </div>

        <ul className="flex flex-col gap-1">
          {reglas.map((regla) => (
            <li
              key={regla.texto}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                regla.cumple ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              <CheckIcon
                className={cn("size-3.5", !regla.cumple && "opacity-30")}
              />
              {regla.texto}
            </li>
          ))}
        </ul>

        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          disabled={cargando}
          className="mt-1 h-12 w-full rounded-[10px] text-base font-semibold"
        >
          {cargando && <LoaderCircleIcon className="size-4 animate-spin" />}
          {cargando ? "Creando cuenta..." : "Crear contraseña y entrar"}
        </Button>
      </form>
    </AuthShell>
  )
}
