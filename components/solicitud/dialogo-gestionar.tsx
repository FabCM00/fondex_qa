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
} from "@/components/ui/dialog"
import { CheckCheckIcon } from "lucide-react"

export function DialogoGestionar({
  abierto,
  onOpenChange,
  nombre,
  radicado,
  onConfirmar,
  enviando,
}: {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  nombre: string
  radicado: string
  onConfirmar: (nota: string) => void
  enviando: boolean
}) {
  // La nota se reinicia con la key que le pone el detalle al abrir.
  const [nota, setNota] = React.useState("")

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <CheckCheckIcon className="size-4.5 text-foreground" />
            </span>
            <div className="flex flex-col gap-1">
              <DialogTitle>Marcar como gestionada</DialogTitle>
              <DialogDescription>
                La solicitud de{" "}
                <span className="font-medium text-foreground">{nombre}</span>{" "}
                pasará a Solicitudes Gestionadas. Quedará registrado tu correo
                y la fecha.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <label htmlFor="nota" className="text-sm font-medium">
            Observación{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </label>
          <textarea
            id="nota"
            rows={3}
            maxLength={500}
            value={nota}
            onChange={(evento) => setNota(evento.target.value)}
            placeholder="Ej: se validó con el asociado por teléfono."
            className="w-full resize-none rounded-md border border-input bg-transparent px-2.5 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
          <p className="font-mono text-[10px] text-muted-foreground">
            {radicado}
          </p>
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" size="sm" disabled={enviando} />}
          >
            Cancelar
          </DialogClose>
          <Button size="sm" disabled={enviando} onClick={() => onConfirmar(nota)}>
            <CheckCheckIcon />
            {enviando ? "Guardando..." : "Marcar gestionada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
