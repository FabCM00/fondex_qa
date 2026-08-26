"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import logo from "@/public/logos/logo1.png"

import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/cliente"
import { cn } from "@/lib/utils"
import {
  CircleCheckIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "lucide-react"

const MINIMO = 8

const inputBase =
  "h-12 w-full rounded-[10px] border bg-background ps-11 pe-11 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground"
const inputNormal =
  "border-input focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
const inputError =
  "border-destructive bg-destructive/5 focus-visible:border-destructive focus-visible:ring-3 focus-visible:ring-destructive/20"

export function FormularioRestablecer() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Better Auth manda el token en la query del enlace del correo.
  const token = searchParams.get("token")

  const [password, setPassword] = React.useState("")
  const [confirmar, setConfirmar] = React.useState("")
  const [ver, setVer] = React.useState(false)

  const [error, setError] = React.useState<string | null>(null)
  const [cargando, setCargando] = React.useState(false)
  const [listo, setListo] = React.useState(false)

  const handleSubmit = async (evento: React.FormEvent) => {
    evento.preventDefault()

    if (!token) return

    if (password.length < MINIMO) {
      return setError(`La contraseña debe tener al menos ${MINIMO} caracteres.`)
    }
    if (password !== confirmar) {
      return setError("Las contraseñas no coinciden.")
    }

    setError(null)
    setCargando(true)

    const { error: fallo } = await authClient.resetPassword({
      newPassword: password,
      token,
    })

    setCargando(false)

    if (fallo) {
      return setError(
        fallo.code === "INVALID_TOKEN" || fallo.code === "TOKEN_EXPIRED"
          ? "El enlace venció o ya se usó. Solicita uno nuevo."
          : (fallo.message ?? "No pudimos cambiar la contraseña.")
      )
    }

    setListo(true)
  }

  // Enlace roto o abierto a mano sin token.
  if (!token) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <TriangleAlertIcon className="size-6 text-destructive" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Enlace no válido
            </h1>
            <p className="text-base text-muted-foreground">
              Este enlace está incompleto. Pide uno nuevo para cambiar tu
              contraseña.
            </p>
          </div>
          <Button
            onClick={() => router.push("/forgot-password")}
            className="mt-2 h-12 w-full rounded-[10px] text-base font-semibold"
          >
            Solicitar enlace nuevo
          </Button>
        </div>
      </AuthShell>
    )
  }

  if (listo) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <CircleCheckIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Contraseña actualizada
            </h1>
            <p className="text-base text-muted-foreground">
              Ya puedes entrar con tu contraseña nueva.
            </p>
          </div>
          <Button
            onClick={() => router.push("/login")}
            className="mt-2 h-12 w-full rounded-[10px] text-base font-semibold"
          >
            Iniciar sesión
          </Button>
        </div>
      </AuthShell>
    )
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
          Crea tu contraseña
        </h1>
        <p className="text-base text-muted-foreground">
          Debe tener al menos {MINIMO} caracteres
        </p>
      </div>

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-semibold">
            Contraseña nueva
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
              placeholder="Ingresa tu contraseña"
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
          <label htmlFor="confirmar" className="text-sm font-semibold">
            Confirma la contraseña
          </label>
          <div className="relative">
            <ShieldCheckIcon
              className={cn(
                "pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2",
                error ? "text-destructive" : "text-muted-foreground"
              )}
            />
            <input
              id="confirmar"
              type={ver ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repite tu contraseña"
              value={confirmar}
              onChange={(evento) => {
                setConfirmar(evento.target.value)
                setError(null)
              }}
              aria-invalid={!!error}
              className={cn(inputBase, error ? inputError : inputNormal)}
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={cargando}
          className="mt-2 h-12 w-full rounded-[10px] text-base font-semibold"
        >
          {cargando && <LoaderCircleIcon className="size-4 animate-spin" />}
          {cargando ? "Guardando..." : "Cambiar contraseña"}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-4 text-center text-sm font-medium text-primary hover:underline"
      >
        Volver a iniciar sesión
      </Link>
    </AuthShell>
  )
}
