"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"

import logo from "@/public/logos/logo1.png"

import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/cliente"
import { cn } from "@/lib/utils"
import {
  ArrowLeftIcon,
  LoaderCircleIcon,
  MailCheckIcon,
  MailIcon,
} from "lucide-react"

const inputBase =
  "h-12 w-full rounded-[10px] border bg-background ps-11 pe-4 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground"
const inputNormal =
  "border-input focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
const inputError =
  "border-destructive bg-destructive/5 focus-visible:border-destructive focus-visible:ring-3 focus-visible:ring-destructive/20"

export function FormularioOlvide() {
  const [email, setEmail] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [cargando, setCargando] = React.useState(false)
  const [enviado, setEnviado] = React.useState(false)

  const handleSubmit = async (evento: React.FormEvent) => {
    evento.preventDefault()

    const emailVal = email.trim()

    if (!emailVal) {
      return setError("Ingresa tu correo electrónico.")
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      return setError("Ingresa un correo válido.")
    }

    setError(null)
    setCargando(true)

    await authClient.requestPasswordReset({
      email: emailVal,
      redirectTo: "/restablecer",
    })

    setCargando(false)
    // Se confirma siempre, exista la cuenta o no: decir "ese correo no está
    // registrado" permitiria averiguar quien tiene cuenta.
    setEnviado(true)
  }

  if (enviado) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <MailCheckIcon className="size-6 text-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Revisa tu correo
            </h1>
            <p className="text-base text-muted-foreground">
              Si <strong className="text-foreground">{email.trim()}</strong>
              {" "}tiene una cuenta, le enviamos un enlace para crear una
              contraseña nueva. Vence en 1 hora.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setEnviado(false)}
            className="mt-2 h-11 w-full rounded-[10px]"
          >
            Usar otro correo
          </Button>
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:underline"
          >
            Volver a iniciar sesión
          </Link>
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
          ¿Olvidaste tu contraseña?
        </h1>
        <p className="text-base text-muted-foreground">
          Te enviamos un enlace para crear una nueva
        </p>
      </div>

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold">
            Correo electrónico
          </label>
          <div className="relative">
            <MailIcon
              className={cn(
                "pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2",
                error ? "text-destructive" : "text-muted-foreground"
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
          {cargando ? "Enviando..." : "Enviar enlace"}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeftIcon className="size-4" />
        Volver a iniciar sesión
      </Link>
    </AuthShell>
  )
}
