"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"

import logo from "@/public/logos/logo1.png"

import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { signIn } from "@/lib/auth/cliente"
import { cn } from "@/lib/utils"
import {
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  MailIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react"

const inputBase =
  "h-12 w-full rounded-[10px] border bg-background ps-11 pe-11 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground"
const inputNormal =
  "border-input focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
const inputError =
  "border-destructive bg-destructive/5 focus-visible:border-destructive focus-visible:ring-3 focus-visible:ring-destructive/20"

type Alerta = "expired" | "closed" | null

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  const [errorEmail, setErrorEmail] = React.useState<string | null>(null)
  const [errorPassword, setErrorPassword] = React.useState<string | null>(null)

  const [verPassword, setVerPassword] = React.useState(false)
  const [cargando, setCargando] = React.useState(false)
  const [redirigiendo, setRedirigiendo] = React.useState(false)

  const parametroSesion = searchParams.get("session")
  const [alerta, setAlerta] = React.useState<Alerta>(
    parametroSesion === "expired" || parametroSesion === "closed"
      ? parametroSesion
      : null
  )

  const handleSubmit = async (evento: React.FormEvent) => {
    evento.preventDefault()

    let hayError = false
    const emailVal = email.trim()

    if (!emailVal) {
      setErrorEmail("Ingresa tu correo electrónico.")
      hayError = true
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setErrorEmail("Ingresa un correo válido.")
      hayError = true
    } else {
      setErrorEmail(null)
    }

    if (!password) {
      setErrorPassword("Ingresa tu contraseña.")
      hayError = true
    } else {
      setErrorPassword(null)
    }

    if (hayError) return

    setCargando(true)
    const { error } = await signIn.email({
      email: emailVal,
      password,
      // "/" resuelve la ruta inicial segun el rol en el servidor.
      callbackURL: searchParams.get("from") ?? "/",
    })
    setCargando(false)

    if (error) {
      return setErrorPassword(
        error.code === "INVALID_EMAIL_OR_PASSWORD"
          ? "Correo o contraseña incorrectos."
          : (error.message ?? "No pudimos iniciar sesión, intenta de nuevo.")
      )
    }

    setRedirigiendo(true)
    router.replace(searchParams.get("from") ?? "/")
    router.refresh()
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <Image
          src={logo}
          alt="WANT N' GET"
          priority
          className="mb-4 h-auto w-22"
        />
        <h1 className="text-2xl font-semibold tracking-tight">
          Inicia sesión en WANT N&apos; GET
        </h1>
        <p className="text-base text-muted-foreground">
          Ingresa tus credenciales para continuar
        </p>
      </div>

      {alerta && (
        <div className="relative flex items-start gap-3 rounded-[10px] bg-primary/10 px-4 py-3">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="pe-6 text-sm font-medium">
            {alerta === "expired"
              ? "Tu sesión expiró. Por favor inicia sesión nuevamente."
              : "Tu sesión se cerró correctamente."}
          </p>
          <button
            type="button"
            onClick={() => setAlerta(null)}
            className="absolute end-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Cerrar alerta"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {/* Campo: Correo Electrónico */}
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold">
            Correo electrónico
          </label>
          <div className="relative">
            <MailIcon
              className={cn(
                "pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2",
                errorEmail ? "text-destructive" : "text-muted-foreground"
              )}
            />
            <input
              id="email"
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="Ingresa tu correo"
              value={email}
              onChange={(evento) => {
                setEmail(evento.target.value)
                setErrorEmail(null)
              }}
              aria-invalid={!!errorEmail}
              className={cn(inputBase, errorEmail ? inputError : inputNormal)}
            />
            {email && (
              <button
                type="button"
                onClick={() => {
                  setEmail("")
                  setErrorEmail(null)
                }}
                className="absolute end-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Limpiar correo"
              >
                <XIcon className="size-5" />
              </button>
            )}
          </div>
          {errorEmail && (
            <p className="text-sm font-medium text-destructive">{errorEmail}</p>
          )}
        </div>

        {/* Campo: Contraseña */}
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-semibold">
            Contraseña
          </label>
          <div className="relative">
            <ShieldCheckIcon
              className={cn(
                "pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2",
                errorPassword ? "text-destructive" : "text-muted-foreground"
              )}
            />
            <input
              id="password"
              type={verPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(evento) => {
                setPassword(evento.target.value)
                setErrorPassword(null)
              }}
              aria-invalid={!!errorPassword}
              className={cn(
                inputBase,
                errorPassword ? inputError : inputNormal
              )}
            />
            <button
              type="button"
              onClick={() => setVerPassword((valor) => !valor)}
              className="absolute end-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={
                verPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
            >
              {verPassword ? (
                <EyeOffIcon className="size-5" />
              ) : (
                <EyeIcon className="size-5" />
              )}
            </button>
          </div>
          {errorPassword && (
            <p className="text-sm font-medium text-destructive">
              {errorPassword}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={cargando || redirigiendo}
          className="mt-2 h-12 w-full rounded-[10px] text-base font-semibold"
        >
          {(cargando || redirigiendo) && (
            <LoaderCircleIcon className="size-4 animate-spin" />
          )}
          {redirigiendo
            ? "Redirigiendo..."
            : cargando
              ? "Iniciando sesión..."
              : "Iniciar sesión"}
        </Button>
      </form>

      <div className="text-center">
        <a
          href="/forgot-password"
          className="text-sm font-medium text-primary hover:underline"
        >
          Olvidé mi contraseña
        </a>
      </div>
    </AuthShell>
  )
}
