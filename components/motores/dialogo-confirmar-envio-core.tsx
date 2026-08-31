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
import { Skeleton } from "@/components/ui/skeleton"
import { previsualizarEnvioCore } from "@/lib/motores/acciones"
import {
  LoaderCircleIcon,
  SendIcon,
  TriangleAlertIcon,
} from "lucide-react"

type Estado =
  | { fase: "cargando" }
  | { fase: "error"; mensaje: string }
  | { fase: "listo"; payload: unknown }

export function DialogoConfirmarEnvioCore({
  radicado,
  onOpenChange,
  onConfirmar,
  enviando,
}: {
  radicado: string
  onOpenChange: (abierto: boolean) => void
  onConfirmar: () => void
  enviando: boolean
}) {
  const [estado, setEstado] = React.useState<Estado>({ fase: "cargando" })

  React.useEffect(() => {
    let vigente = true

    previsualizarEnvioCore(radicado).then((resultado) => {
      if (!vigente) return
      setEstado(
        resultado.ok
          ? { fase: "listo", payload: resultado.payload }
          : { fase: "error", mensaje: resultado.mensaje }
      )
    })

    return () => {
      vigente = false
    }
  }, [radicado])

  return (
    <Dialog open onOpenChange={enviando ? undefined : onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <SendIcon className="size-4.5 text-foreground" />
            </span>
            <div className="flex flex-col gap-1">
              <DialogTitle>Enviar a Core</DialogTitle>
              <DialogDescription>
                ¿Está seguro de enviar el radicado{" "}
                <span className="font-mono text-foreground">{radicado}</span>{" "}
                a Core? Esta acción consume un intento de envío.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {estado.fase === "cargando" && (
            <>
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          )}

          {estado.fase === "error" && (
            <p className="flex items-start gap-2 rounded-md border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
              <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
              {estado.mensaje}
            </p>
          )}

          {estado.fase === "listo" && (
            <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">
              {JSON.stringify(estado.payload, null, 2)}
            </pre>
          )}
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" size="sm" disabled={enviando} />}
          >
            Cancelar
          </DialogClose>
          <Button
            size="sm"
            onClick={onConfirmar}
            disabled={estado.fase !== "listo" || enviando}
          >
            {enviando ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <SendIcon />
            )}
            {enviando ? "Enviando..." : "Confirmar envío"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
