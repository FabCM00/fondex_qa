"use client"

import * as React from "react"

import { CampoControl } from "@/components/motores/campo-control"
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
import {
  cargarFormularioEdicion,
  ejecutarConCambios,
} from "@/lib/motores/acciones"
import { MOTOR_POR_DEFECTO, type CampoFormulario } from "@/lib/motores/schema"
import {
  LoaderCircleIcon,
  PlayIcon,
  SlidersHorizontalIcon,
  TriangleAlertIcon,
} from "lucide-react"

type Valores = Record<string, string | number | boolean | null>

type Estado =
  | { fase: "cargando" }
  | { fase: "error"; mensaje: string }
  | { fase: "listo"; campos: CampoFormulario[] }

function valoresDe(campos: CampoFormulario[]): Valores {
  return Object.fromEntries(campos.map((campo) => [campo.campo, campo.valor]))
}

export function DialogoEditarMotor({
  onOpenChange,
  radicado,
  motor = MOTOR_POR_DEFECTO,
  onEjecutado,
}: {
  onOpenChange: (abierto: boolean) => void
  radicado: string
  motor?: string
  onEjecutado: (mensaje: string) => void
}) {
  const [estado, setEstado] = React.useState<Estado>({ fase: "cargando" })
  const [valores, setValores] = React.useState<Valores>({})
  const [iniciales, setIniciales] = React.useState<Valores>({})
  const [ejecutando, setEjecutando] = React.useState(false)
  const [errorEjecucion, setErrorEjecucion] = React.useState<string | null>(null)

  React.useEffect(() => {
    let vigente = true

    cargarFormularioEdicion(radicado, motor).then((resultado) => {
      if (!vigente) return

      if (!resultado.ok) {
        setEstado({ fase: "error", mensaje: resultado.mensaje })
        return
      }

      const base = valoresDe(resultado.campos)
      setEstado({ fase: "listo", campos: resultado.campos })
      setValores(base)
      setIniciales(base)
    })

    return () => {
      vigente = false
    }
  }, [radicado, motor])

  const modificado = React.useMemo(
    () =>
      Object.keys(iniciales).some(
        (clave) => String(valores[clave]) !== String(iniciales[clave])
      ),
    [valores, iniciales]
  )

  const ejecutar = async () => {
    if (estado.fase !== "listo") return

    setEjecutando(true)
    setErrorEjecucion(null)

    const editables = estado.campos.filter((campo) => campo.editable)
    const cambios = Object.fromEntries(
      editables.map((campo) => [campo.campo, valores[campo.campo]])
    )

    const resultado = await ejecutarConCambios(radicado, cambios, motor)
    setEjecutando(false)

    if (!resultado.ok) {
      setErrorEjecucion(resultado.mensaje)
      return
    }

    onOpenChange(false)
    onEjecutado(resultado.mensaje)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <SlidersHorizontalIcon className="size-4.5 text-foreground" />
            </span>
            <div className="flex flex-col gap-1">
              <DialogTitle>Editar y ejecutar motor</DialogTitle>
              <DialogDescription>
                Ajusta los campos habilitados y vuelve a ejecutar el motor. El
                resultado anterior queda en el historial.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="-mx-1 flex max-h-[45vh] flex-col gap-4 overflow-y-auto px-1 py-1">
          {estado.fase === "cargando" && (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          )}

          {estado.fase === "error" && (
            <p className="flex items-start gap-2 rounded-md border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
              <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
              {estado.mensaje}
            </p>
          )}

          {estado.fase === "listo" &&
            estado.campos.map((campo) => (
              <CampoControl
                key={campo.id}
                campo={campo}
                valor={valores[campo.campo] ?? null}
                deshabilitado={ejecutando}
                onChange={(valor) =>
                  setValores((previos) => ({
                    ...previos,
                    [campo.campo]: valor,
                  }))
                }
              />
            ))}
        </div>

        {errorEjecucion && (
          <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
            {errorEjecucion}
          </p>
        )}

        <DialogFooter>
          <p className="me-auto font-mono text-[10px] text-muted-foreground">
            {radicado}
          </p>
          <DialogClose
            render={<Button variant="outline" size="sm" disabled={ejecutando} />}
          >
            Cancelar
          </DialogClose>
          <Button
            size="sm"
            onClick={ejecutar}
            disabled={estado.fase !== "listo" || !modificado || ejecutando}
          >
            {ejecutando ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <PlayIcon />
            )}
            {ejecutando ? "Ejecutando..." : "Ejecutar Motor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
