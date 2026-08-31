"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeftIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  ShieldCheckIcon,
} from "lucide-react"

import logo from "@/public/logos/logo1.png"

import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { esRutaProtegida } from "@/lib/auth/roles"
import { twoFactor } from "@/lib/auth/cliente"

export function FormularioVerificar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [codigo, setCodigo] = React.useState("")
  const [recordar, setRecordar] = React.useState(true)
  const [usarRespaldo, setUsarRespaldo] = React.useState(false)

  const [error, setError] = React.useState<string | null>(null)
  const [cargando, setCargando] = React.useState(false)

  const largo = usarRespaldo ? 8 : 6
  const completo = codigo.length === largo

  // Tamaño dinámico: 6 dígitos = grande / 8 dígitos = ajustado para no romper el contenedor
  const slotSize = usarRespaldo
    ? "size-9 sm:size-10 text-base font-semibold"
    : "size-12 sm:size-14 text-xl sm:text-2xl font-bold"

  const verificar = async (evento: React.FormEvent) => {
    evento.preventDefault()

    if (!completo) {
      return setError(`El código tiene ${largo} caracteres.`)
    }

    setError(null)
    setCargando(true)

    const { error: fallo } = usarRespaldo
      ? await twoFactor.verifyBackupCode({
          code: codigo,
          trustDevice: recordar,
        })
      : await twoFactor.verifyTotp({ code: codigo, trustDevice: recordar })

    if (fallo) {
      setCargando(false)
      setCodigo("")
      return setError(
        fallo.code === "INVALID_TWO_FACTOR_AUTHENTICATION"
          ? "El código no es correcto. Revisa tu app e intenta de nuevo."
          : (fallo.message ?? "No pudimos verificar el código.")
      )
    }

    const from = searchParams.get("from")
    router.replace(from && !esRutaProtegida(from) ? from : "/")
    router.refresh()
  }

  const alternarModoRespaldo = () => {
    setUsarRespaldo((valor) => !valor)
    setCodigo("")
    setError(null)
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        {/* Encabezado */}
        <header className="flex flex-col gap-2">
          <Image
            src={logo}
            alt="WANT N' GET"
            priority
            className="mb-2 h-auto w-22"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Verifica tu identidad
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {usarRespaldo
              ? "Ingresa uno de tus códigos de respaldo de 8 caracteres."
              : "Ingresa el código de 6 dígitos de tu app de autenticación."}
          </p>
        </header>

        {/* Formulario Principal */}
        <form className="flex flex-col gap-5" onSubmit={verificar}>
          <div className="flex w-full flex-col items-center gap-2">
            <InputOTP
              maxLength={largo}
              value={codigo}
              onChange={(val) => {
                setCodigo(val)
                setError(null)
              }}
              disabled={cargando}
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? "codigo-error" : undefined}
              containerClassName="justify-center max-w-full overflow-x-auto py-1"
            >
              {usarRespaldo ? (
                <>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className={slotSize} />
                    <InputOTPSlot index={1} className={slotSize} />
                    <InputOTPSlot index={2} className={slotSize} />
                    <InputOTPSlot index={3} className={slotSize} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={4} className={slotSize} />
                    <InputOTPSlot index={5} className={slotSize} />
                    <InputOTPSlot index={6} className={slotSize} />
                    <InputOTPSlot index={7} className={slotSize} />
                  </InputOTPGroup>
                </>
              ) : (
                <>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className={slotSize} />
                    <InputOTPSlot index={1} className={slotSize} />
                    <InputOTPSlot index={2} className={slotSize} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className={slotSize} />
                    <InputOTPSlot index={4} className={slotSize} />
                    <InputOTPSlot index={5} className={slotSize} />
                  </InputOTPGroup>
                </>
              )}
            </InputOTP>

            {error && (
              <p
                id="codigo-error"
                className="text-xs font-medium text-destructive"
              >
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Checkbox
              id="recordar"
              checked={recordar}
              onCheckedChange={(checked) => setRecordar(checked === true)}
            />
            <label
              htmlFor="recordar"
              className="cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              No volver a pedir en este dispositivo por 30 días
            </label>
          </div>

          <Button
            type="submit"
            disabled={!completo || cargando}
            className="h-12 w-full rounded-[10px] text-base font-semibold shadow-xs"
          >
            {cargando ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <ShieldCheckIcon className="size-4" />
            )}
            {cargando ? "Verificando..." : "Verificar"}
          </Button>
        </form>

        {/* Links y Navegación Secundarios */}
        <footer className="flex flex-col items-center gap-3 border-t pt-4 text-sm">
          <button
            type="button"
            onClick={alternarModoRespaldo}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <KeyRoundIcon className="size-3.5" />
            {usarRespaldo
              ? "Usar el código de mi app"
              : "No tengo mi teléfono: usar código de respaldo"}
          </button>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            <ArrowLeftIcon className="size-3.5" />
            Volver a iniciar sesión
          </Link>
        </footer>
      </div>
    </AuthShell>
  )
}