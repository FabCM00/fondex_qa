"use client"

import * as React from "react"

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
import type { Documento } from "@/lib/documentos/schema"
import { FileTextIcon, LoaderCircleIcon, MailIcon } from "lucide-react"

/**
 * Confirmacion del envio a firma.
 *
 * Con varios documentos se explica lo que va a pasar: el primero de la
 * seleccion es el principal, el resto van como anexos del mismo sobre y el
 * firmante los firma todos con un solo enlace.
 */
export function DialogoFirma({
  abierto,
  onOpenChange,
  seleccionados,
  firmanteInicial,
  enviando,
  onConfirmar,
}: {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  /** En orden: el primero es el principal. */
  seleccionados: Documento[]
  firmanteInicial: { nombre: string; email: string }
  enviando: boolean
  onConfirmar: (firmante: { nombre: string; email: string }) => void
}) {
  const [nombre, setNombre] = React.useState(firmanteInicial.nombre)
  const [email, setEmail] = React.useState(firmanteInicial.email)

  // Si los datos del asociado llegan despues de abrir, se rellenan los campos
  // que el colaborador aun no ha tocado.
  const [previo, setPrevio] = React.useState(firmanteInicial)

  if (
    firmanteInicial.nombre !== previo.nombre ||
    firmanteInicial.email !== previo.email
  ) {
    setPrevio(firmanteInicial)
    if (!nombre) setNombre(firmanteInicial.nombre)
    if (!email) setEmail(firmanteInicial.email)
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const puedeEnviar = !!nombre.trim() && emailValido && !enviando

  const [principal, ...anexos] = seleccionados

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar a firma</DialogTitle>
          <DialogDescription>
            {seleccionados.length === 1
              ? "Se enviará un correo con el enlace de firma."
              : `Los ${seleccionados.length} documentos van en un solo sobre: el firmante los firma todos con un enlace.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Que se envia. El orden importa y se dice explicitamente. */}
          <div className="flex flex-col gap-1.5 rounded-lg border p-3">
            {principal && (
              <div className="flex items-center gap-2">
                <FileTextIcon className="size-4 shrink-0 text-primary" />
                <span className="truncate text-sm font-medium">
                  {principal.nombre}
                </span>
                {anexos.length > 0 && (
                  <span className="ms-auto shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Principal
                  </span>
                )}
              </div>
            )}

            {anexos.map((documento) => (
              <div key={documento.id} className="flex items-center gap-2 ps-6">
                <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-xs text-muted-foreground">
                  {documento.nombre}
                </span>
                <span className="ms-auto shrink-0 text-[10px] text-muted-foreground">
                  Anexo
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="firmante-nombre">Nombre del firmante</Label>
            <Input
              id="firmante-nombre"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              placeholder="Nombre completo"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="firmante-email">Correo del firmante</Label>
            <div className="relative">
              <MailIcon className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="firmante-email"
                type="email"
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                placeholder="correo@ejemplo.com"
                autoComplete="off"
                aria-invalid={email.length > 0 && !emailValido}
                className="ps-8"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              ZapSign le envía el enlace a este correo.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onConfirmar({ nombre: nombre.trim(), email: email.trim() })
            }
            disabled={!puedeEnviar}
          >
            {enviando && <LoaderCircleIcon className="size-4 animate-spin" />}
            {enviando ? "Enviando..." : "Enviar a firma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
