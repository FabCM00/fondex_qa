"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ROLES, type Rol } from "@/lib/auth/roles"
import { MailPlusIcon, PlusIcon, UserPlusIcon, XIcon } from "lucide-react"

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function DialogoInvitar({
  onInvitar,
}: {
  onInvitar: (correos: string[], rol: Rol) => void
}) {
  const [abierto, setAbierto] = React.useState(false)
  const [correos, setCorreos] = React.useState<string[]>([])
  const [borrador, setBorrador] = React.useState("")
  const [rol, setRol] = React.useState<Rol>("COLABORADOR")
  const [error, setError] = React.useState<string | null>(null)

  const limpiar = () => {
    setCorreos([])
    setBorrador("")
    setRol("COLABORADOR")
    setError(null)
  }

  const agregar = () => {
    const valor = borrador.trim().toLowerCase()

    if (!valor) return setError("Escribe un correo.")
    if (!CORREO_VALIDO.test(valor)) return setError("Ese correo no es válido.")
    if (correos.includes(valor)) return setError("Ese correo ya está en la lista.")

    setCorreos((prev) => [...prev, valor])
    setBorrador("")
    setError(null)
  }

  const quitar = (correo: string) =>
    setCorreos((prev) => prev.filter((actual) => actual !== correo))

  const enviar = () => {
    // Si quedó algo escrito sin agregar, se toma también.
    const pendiente = borrador.trim().toLowerCase()
    const lista =
      pendiente && CORREO_VALIDO.test(pendiente) && !correos.includes(pendiente)
        ? [...correos, pendiente]
        : correos

    if (lista.length === 0) {
      return setError("Agrega al menos un correo.")
    }

    onInvitar(lista, rol)
    setAbierto(false)
    limpiar()
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(valor) => {
        setAbierto(valor)
        if (!valor) limpiar()
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <UserPlusIcon />
        Invitar usuario
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar usuarios</DialogTitle>
          <DialogDescription>
            Agrega uno o varios correos y elige con qué rol entran. Cada uno
            recibirá un enlace para crear su contraseña.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <label htmlFor="correo-invitado" className="text-sm font-medium">
            Correos
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="correo-invitado"
              type="email"
              placeholder="nombre@wantnget.com.co"
              value={borrador}
              onChange={(evento) => {
                setBorrador(evento.target.value)
                setError(null)
              }}
              onKeyDown={(evento) => {
                // Enter o coma agregan sin enviar el formulario.
                if (evento.key === "Enter" || evento.key === ",") {
                  evento.preventDefault()
                  agregar()
                }
              }}
              aria-invalid={!!error}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Agregar correo"
              onClick={agregar}
            >
              <PlusIcon />
            </Button>
          </div>
          {error && (
            <p className="text-xs font-medium text-destructive">{error}</p>
          )}
          {!error && (
            <p className="text-xs text-muted-foreground">
              Presiona Enter o el botón + para agregar cada correo.
            </p>
          )}

          {correos.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 pt-1">
              {correos.map((correo) => (
                <li
                  key={correo}
                  className="flex items-center gap-1 rounded-full bg-primary/10 py-1 ps-2.5 pe-1 text-xs"
                >
                  <span className="truncate">{correo}</span>
                  <button
                    type="button"
                    onClick={() => quitar(correo)}
                    aria-label={`Quitar ${correo}`}
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  >
                    <XIcon className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Rol</span>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => setRol(opcion)}
                data-active={rol === opcion || undefined}
                className="rounded-lg border px-3 py-2 text-start text-sm transition-colors hover:border-primary/60 data-active:border-primary data-active:bg-primary/10 data-active:font-medium"
              >
                {opcion === "ADMIN" ? "Administrador" : "Colaborador"}
                <span className="block text-xs text-muted-foreground">
                  {opcion === "ADMIN"
                    ? "Gestiona usuarios"
                    : "Gestiona solicitudes"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="sm" />}>
            Cancelar
          </DialogClose>
          <Button size="sm" onClick={enviar}>
            <MailPlusIcon />
            Enviar {correos.length > 0 ? `(${correos.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
