"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import logo from "@/public/logos/logo1.png"

import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { avisoDeParametros, type Aviso } from "@/lib/auth/avisos-login"
import { getLastUsedLoginMethod, signIn } from "@/lib/auth/cliente"
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

/**
 * La cookie del ultimo metodo es una fuente externa a React y no cambia sola
 * mientras la pantalla esta abierta, asi que no hay a que suscribirse.
 */
const sinCambios = () => () => {}

/**
 * Con que entro el usuario la ultima vez, o null si no hay rastro.
 *
 * Va por `useSyncExternalStore` y no por estado + efecto: el servidor
 * prerenderiza sin la cookie (vive en el navegador), y este hook es justo el que
 * sabe dar un valor distinto en servidor y cliente sin romper la hidratacion ni
 * disparar un render en cascada.
 */
function useUltimoMetodo() {
  return React.useSyncExternalStore(
    sinCambios,
    () => getLastUsedLoginMethod(),
    () => null // en el servidor no hay cookie que leer
  )
}

/** Marca el camino que el usuario ya conoce. No implica nada de seguridad. */
function EtiquetaUltimoAcceso() {
  return (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      Lo usaste la última vez
    </span>
  )
}


export function LoginForm({
  /** El proveedor solo se ofrece si el servidor tiene sus credenciales. */
  conMicrosoft = false,
}: {
  conMicrosoft?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  const [errorEmail, setErrorEmail] = React.useState<string | null>(null)
  const [errorPassword, setErrorPassword] = React.useState<string | null>(null)

  const [verPassword, setVerPassword] = React.useState(false)
  const [cargando, setCargando] = React.useState(false)
  const [redirigiendo, setRedirigiendo] = React.useState(false)

  // Con que entro el usuario la ultima vez, para resaltarle ese camino.
  const ultimoMetodo = useUltimoMetodo()

  // "email" es el nombre que le da Better Auth al login con correo y contrasena.
  const ultimoFueCorreo = ultimoMetodo === "email"
  const ultimoFueMicrosoft = ultimoMetodo === "microsoft"

  // El aviso sale de la URL: lo ponen el cierre de sesion, el middleware o el
  // rechazo de un login social. La tabla de mensajes vive en avisos-login.ts.
  const [alerta, setAlerta] = React.useState<Aviso | null>(() =>
    avisoDeParametros(new URLSearchParams(searchParams.toString()))
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
    const { data, error } = await signIn.email({
      email: emailVal,
      password,
      // "/" resuelve la ruta inicial según el rol en el servidor.
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

    // La cuenta tiene segundo factor: la contrasena fue correcta pero todavia
    // no hay sesion. Falta el codigo, y eso pasa en /verificar.
    if ((data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
      const destino = searchParams.get("from")
      setRedirigiendo(true)
      return router.push(
        destino ? `/verificar?from=${encodeURIComponent(destino)}` : "/verificar"
      )
    }

    setRedirigiendo(true)
    router.replace(searchParams.get("from") ?? "/")
    router.refresh()
  }

  const entrarConMicrosoft = async () => {
    setErrorPassword(null)
    setCargando(true)

    const { error } = await signIn.social({
      provider: "microsoft",
      callbackURL: searchParams.get("from") ?? "/",
    })

    if (error) {
      setCargando(false)
      setErrorPassword(
        error.message ?? "No pudimos entrar con Microsoft, intenta de nuevo."
      )
    }
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        {/* Encabezado */}
        <div className="flex flex-col gap-2">
          <Image
            src={logo}
            alt="WANT N' GET"
            priority
            className="mb-2 h-auto w-24"
          />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Inicia sesión en WANT N&apos; GET
          </h1>
          <p className="text-sm text-muted-foreground">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Aviso: cierre de sesión, expiración o rechazo del login social. */}
        {alerta && (
          <div
            className={cn(
              "relative flex items-start gap-3 rounded-[10px] px-4 py-3",
              alerta.tono === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            )}
          >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <p className="pe-6 text-sm font-medium">{alerta.mensaje}</p>
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

        {/* Formulario Principal */}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {/* Campo: Correo Electrónico */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">
                Correo electrónico
              </label>
              {ultimoFueCorreo && <EtiquetaUltimoAcceso />}
            </div>
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
              <p className="text-xs font-medium text-destructive">{errorEmail}</p>
            )}
          </div>

          {/* Campo: Contraseña */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
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
                className={cn(inputBase, errorPassword ? inputError : inputNormal)}
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
              <p className="text-xs font-medium text-destructive">
                {errorPassword}
              </p>
            )}
          </div>

          {/* Botón de Inicio de Sesión */}
          <Button
            type="submit"
            disabled={cargando || redirigiendo}
            className="mt-1 h-12 w-full rounded-[10px] text-base font-semibold"
          >
            {(cargando || redirigiendo) && (
              <LoaderCircleIcon className="size-4 animate-spin me-2" />
            )}
            {redirigiendo
              ? "Redirigiendo..."
              : cargando
                ? "Iniciando sesión..."
                : "Iniciar sesión"}
          </Button>
        </form>

        {/* Separador */}
        <div className="flex items-center gap-3 my-1">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase text-muted-foreground">o</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* Bloque Microsoft */}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={entrarConMicrosoft}
            disabled={!conMicrosoft || cargando || redirigiendo}
            title={
              conMicrosoft
                ? undefined
                : "Aún no está habilitado el ingreso con Microsoft."
            }
            className={cn(
              "h-12 w-full gap-2.5 rounded-[10px] text-base font-medium",
              // Resalta el boton si es el camino que ya uso el usuario.
              ultimoFueMicrosoft && conMicrosoft && "border-primary/40 bg-primary/5"
            )}
          >
            <svg viewBox="0 0 21 21" className="size-4 shrink-0" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Continuar con Microsoft
          </Button>

          {ultimoFueMicrosoft && conMicrosoft && (
            <div className="flex justify-center">
              <EtiquetaUltimoAcceso />
            </div>
          )}

          {!conMicrosoft && (
            <p className="text-center text-xs text-muted-foreground">
              El ingreso con Microsoft aún no está habilitado.
            </p>
          )}
        </div>
      </div>
    </AuthShell>
  )
}