"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNotificaciones } from "@/components/ui/notificaciones"
import { guardarAjusteMotor } from "@/lib/motores/acciones"
import { MOTOR_POR_DEFECTO, type AjusteMotor } from "@/lib/motores/schema"
import { CheckIcon, MinusIcon, PencilIcon, PlusIcon, XIcon } from "lucide-react"

function FilaAjuste({
  ajuste,
  onGuardar,
}: {
  ajuste: AjusteMotor
  onGuardar: (valorNumero: number) => Promise<void>
}) {
  const [editando, setEditando] = React.useState(false)
  const [valor, setValor] = React.useState(ajuste.valorNumero ?? 0)
  const [guardando, setGuardando] = React.useState(false)

  const cancelar = () => {
    setValor(ajuste.valorNumero ?? 0)
    setEditando(false)
  }

  const guardar = async () => {
    setGuardando(true)
    await onGuardar(valor)
    setGuardando(false)
    setEditando(false)
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <Label
        htmlFor={`ajuste-${ajuste.clave}`}
        className="flex-col items-start gap-1"
      >
        <span className="text-sm font-medium">{ajuste.etiqueta}</span>
        {ajuste.ayuda && (
          <span className="text-xs font-normal text-muted-foreground">
            {ajuste.ayuda}
          </span>
        )}
      </Label>

      <div className="flex shrink-0 items-center gap-1.5">
        {editando && (
          <Button
            size="icon-sm"
            variant="outline"
            disabled={guardando || valor <= 0}
            onClick={() => setValor((previo) => Math.max(0, previo - 1))}
            aria-label="Disminuir"
          >
            <MinusIcon className="size-4" />
          </Button>
        )}

        <Input
          id={`ajuste-${ajuste.clave}`}
          type="number"
          min={0}
          className="w-20 text-center"
          disabled={!editando || guardando}
          value={valor}
          onChange={(evento) => {
            const numero = Number(evento.target.value)
            if (Number.isFinite(numero)) setValor(Math.max(0, numero))
          }}
        />

        {editando && (
          <Button
            size="icon-sm"
            variant="outline"
            disabled={guardando}
            onClick={() => setValor((previo) => previo + 1)}
            aria-label="Aumentar"
          >
            <PlusIcon className="size-4" />
          </Button>
        )}

        {editando ? (
          <>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={guardando}
              onClick={guardar}
              aria-label="Guardar"
            >
              <CheckIcon className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={guardando}
              onClick={cancelar}
              aria-label="Cancelar"
            >
              <XIcon className="size-4" />
            </Button>
          </>
        ) : (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setEditando(true)}
            aria-label="Editar"
          >
            <PencilIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function AjustesMotor({
  motor = MOTOR_POR_DEFECTO,
  inicial,
}: {
  motor?: string
  inicial: AjusteMotor[]
}) {
  const [ajustes, setAjustes] = React.useState(inicial)
  const { notificar } = useNotificaciones()

  const guardar = async (clave: string, valorNumero: number) => {
    setAjustes((previos) =>
      previos.map((ajuste) =>
        ajuste.clave === clave ? { ...ajuste, valorNumero } : ajuste
      )
    )

    const resultado = await guardarAjusteMotor(motor, clave, valorNumero)
    notificar(resultado.mensaje, resultado.ok ? "exito" : "error")
  }

  if (!ajustes.length) {
    return (
      <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
        No hay ajustes configurados para este motor.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Intentos permitidos</h2>
        <p className="text-xs text-muted-foreground">
          Cuántas veces puede usarse cada función por radicado antes de
          bloquearse.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {ajustes.map((ajuste) => (
          <FilaAjuste
            key={ajuste.id}
            ajuste={ajuste}
            onGuardar={(valorNumero) => guardar(ajuste.clave, valorNumero)}
          />
        ))}
      </div>
    </div>
  )
}
