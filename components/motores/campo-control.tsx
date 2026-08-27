"use client"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { CampoFormulario } from "@/lib/motores/schema"
import { LockIcon } from "lucide-react"

export function CampoControl({
  campo,
  valor,
  onChange,
  deshabilitado,
}: {
  campo: CampoFormulario
  valor: string | number | boolean | null
  onChange: (valor: string | number | boolean | null) => void
  deshabilitado: boolean
}) {
  const bloqueado = deshabilitado || !campo.editable
  const id = `campo-${campo.id}`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {campo.etiqueta}
        </label>

        {!campo.editable && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <LockIcon className="size-3" />
            No editable
          </span>
        )}
      </div>

      {campo.tipo === "BOOLEANO" ? (
        <Switch
          id={id}
          checked={valor === true}
          onCheckedChange={(marcado) => onChange(marcado)}
          disabled={bloqueado}
        />
      ) : (
        <Input
          id={id}
          type={campo.tipo === "NUMERO" ? "number" : "text"}
          value={valor === null ? "" : String(valor)}
          onChange={(evento) => onChange(evento.target.value)}
          disabled={bloqueado}
          placeholder={campo.presente ? undefined : "Sin valor en el request"}
        />
      )}

      <p className="font-mono text-[10px] text-muted-foreground">
        {campo.campo}
        {campo.ayuda && (
          <span className="ms-1.5 font-sans not-italic">· {campo.ayuda}</span>
        )}
      </p>
    </div>
  )
}
