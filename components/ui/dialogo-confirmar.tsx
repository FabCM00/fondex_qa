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
import { TriangleAlertIcon } from "lucide-react"

/** Confirmacion para acciones que no se pueden deshacer. */
export function DialogoConfirmar({
  abierto,
  onOpenChange,
  titulo,
  descripcion,
  textoConfirmar = "Confirmar",
  onConfirmar,
}: {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  titulo: string
  descripcion: React.ReactNode
  textoConfirmar?: string
  onConfirmar: () => void
}) {
  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <TriangleAlertIcon className="size-4.5 text-destructive" />
            </span>
            <div className="flex flex-col gap-1">
              <DialogTitle>{titulo}</DialogTitle>
              <DialogDescription>{descripcion}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onOpenChange(false)
              onConfirmar()
            }}
          >
            {textoConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
