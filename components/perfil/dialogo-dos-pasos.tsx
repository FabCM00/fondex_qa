"use client"

import * as React from "react"
import QRCode from "qrcode"

import { Button } from "@/components/ui/button"
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
import { twoFactor } from "@/lib/auth/cliente"
import {
  CheckIcon,
  CopyIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
} from "lucide-react"

/**
 * Activar la verificacion en dos pasos.
 *
 * Son tres pasos y el orden importa: se pide la contrasena (para que nadie
 * active el 2FA en una sesion ajena), se escanea el QR, y solo se da por
 * activo cuando el usuario demuestra que su app genera codigos validos. Sin ese
 * ultimo paso alguien podria quedarse fuera de su propia cuenta.
 */
type Paso = "password" | "qr" | "respaldo"

export function DialogoDosPasos({
  abierto,
  onOpenChange,
  onActivado,
}: {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  onActivado: () => void
}) {
  const [paso, setPaso] = React.useState<Paso>("password")

  const [password, setPassword] = React.useState("")
  const [codigo, setCodigo] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [cargando, setCargando] = React.useState(false)

  const [qr, setQr] = React.useState<string | null>(null)
  const [secreto, setSecreto] = React.useState<string | null>(null)
  const [respaldo, setRespaldo] = React.useState<string[]>([])
  const [copiado, setCopiado] = React.useState(false)

  /** Paso 1: la contrasena desbloquea el secreto y los codigos de respaldo. */
  const activar = async () => {
    if (!password) return setError("Ingresa tu contraseña.")

    setError(null)
    setCargando(true)

    // `method: "totp"` para que la respuesta traiga el URI y los codigos de
    // respaldo: el plugin tambien soporta OTP por correo, y ahi no vienen.
    const { data, error: fallo } = await twoFactor.enable({
      password,
      method: "totp",
    })

    setCargando(false)

    if (fallo) {
      return setError(
        fallo.code === "INVALID_PASSWORD"
          ? "La contraseña no es correcta."
          : (fallo.message ?? "No pudimos activar la verificación.")
      )
    }

    if (!data || !("totpURI" in data)) {
      return setError("No recibimos el código de configuración.")
    }

    // El URI otpauth:// es lo que la app de autenticacion entiende; se pinta
    // como QR para no tener que escribirlo a mano.
    setQr(await QRCode.toDataURL(data.totpURI, { margin: 1, width: 240 }))
    // El secreto en texto sirve cuando no se puede escanear (escritorio).
    setSecreto(new URL(data.totpURI).searchParams.get("secret"))
    setRespaldo(data.backupCodes ?? [])
    setPaso("qr")
  }

  /** Paso 2: el codigo confirma que la app quedo bien configurada. */
  const confirmar = async () => {
    if (codigo.length !== 6) return setError("El código tiene 6 dígitos.")

    setError(null)
    setCargando(true)

    const { error: fallo } = await twoFactor.verifyTotp({ code: codigo })

    setCargando(false)

    if (fallo) {
      setCodigo("")
      return setError("El código no es correcto. Revisa tu app.")
    }

    setPaso("respaldo")
  }

  const copiarRespaldo = async () => {
    try {
      await navigator.clipboard.writeText(respaldo.join("\n"))
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {paso === "password" && (
          <>
            <DialogHeader>
              <DialogTitle>Activar verificación en dos pasos</DialogTitle>
              <DialogDescription>
                Confirma tu contraseña para continuar.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password-2fa">Contraseña</Label>
              <Input
                id="password-2fa"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(evento) => {
                  setPassword(evento.target.value)
                  setError(null)
                }}
                onKeyDown={(evento) => evento.key === "Enter" && activar()}
                aria-invalid={!!error}
              />
              {error && (
                <p className="text-sm font-medium text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={cargando}
              >
                Cancelar
              </Button>
              <Button onClick={activar} disabled={!password || cargando}>
                {cargando && (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                )}
                Continuar
              </Button>
            </DialogFooter>
          </>
        )}

        {paso === "qr" && (
          <>
            <DialogHeader>
              <DialogTitle>Escanea el código</DialogTitle>
              <DialogDescription>
                Ábrelo con Microsoft Authenticator, Google Authenticator o
                similar, y escribe el código de 6 dígitos que te muestre.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4">
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element -- data URI generado en el cliente
                <img
                  src={qr}
                  alt="Código QR para la app de autenticación"
                  className="rounded-lg border bg-white p-2"
                />
              )}

              {secreto && (
                <div className="flex w-full flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    ¿No puedes escanear? Escribe esta clave:
                  </span>
                  <code className="rounded bg-muted px-2 py-1 font-mono text-xs break-all">
                    {secreto}
                  </code>
                </div>
              )}

              <div className="flex w-full flex-col gap-2">
                <Label htmlFor="codigo-2fa">Código de tu app</Label>
                <Input
                  id="codigo-2fa"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={codigo}
                  onChange={(evento) => {
                    setCodigo(
                      evento.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                    setError(null)
                  }}
                  onKeyDown={(evento) => evento.key === "Enter" && confirmar()}
                  aria-invalid={!!error}
                  className="text-center font-mono text-lg tracking-[0.3em]"
                />
                {error && (
                  <p className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={cargando}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmar}
                disabled={codigo.length !== 6 || cargando}
              >
                {cargando && (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                )}
                Confirmar
              </Button>
            </DialogFooter>
          </>
        )}

        {paso === "respaldo" && (
          <>
            <DialogHeader>
              <DialogTitle>Guarda tus códigos de respaldo</DialogTitle>
              <DialogDescription>
                Son tu única forma de entrar si pierdes el teléfono. Cada uno
                sirve una sola vez.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
                <span>
                  No los volverás a ver. Guárdalos en un lugar seguro antes de
                  cerrar.
                </span>
              </p>

              <ul className="grid grid-cols-2 gap-1.5 rounded-lg border p-3 font-mono text-sm">
                {respaldo.map((codigoRespaldo) => (
                  <li key={codigoRespaldo} className="text-center">
                    {codigoRespaldo}
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                size="sm"
                onClick={copiarRespaldo}
                className="gap-1.5"
              >
                {copiado ? (
                  <CheckIcon className="size-3.5 text-emerald-600" />
                ) : (
                  <CopyIcon className="size-3.5" />
                )}
                {copiado ? "Copiados" : "Copiar todos"}
              </Button>
            </div>

            <DialogFooter>
              <Button
                onClick={() => {
                  onActivado()
                  onOpenChange(false)
                }}
              >
                Ya los guardé
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
