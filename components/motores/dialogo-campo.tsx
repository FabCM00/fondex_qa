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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  TIPO_CAMPO_LABEL,
  TIPOS_CAMPO,
  type CampoEdicion,
  type EntradaCampo,
  type TipoCampo,
} from "@/lib/motores/schema"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

type Borrador = {
  campo: string
  etiqueta: string
  tipo: TipoCampo
  editable: boolean
  ayuda: string
  orden: string
}

function borradorDe(campo: CampoEdicion | null): Borrador {
  return {
    campo: campo?.campo ?? "",
    etiqueta: campo?.etiqueta ?? "",
    tipo: campo?.tipo ?? "TEXTO",
    editable: campo?.editable ?? true,
    ayuda: campo?.ayuda ?? "",
    orden: String(campo?.orden ?? 0),
  }
}

export function DialogoCampo({
  abierto,
  onOpenChange,
  motor,
  campo,
  onGuardar,
  guardando,
}: {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  motor: string
  campo: CampoEdicion | null
  onGuardar: (entrada: EntradaCampo, id?: string) => void
  guardando: boolean
}) {
  const [borrador, setBorrador] = React.useState<Borrador>(() =>
    borradorDe(campo)
  )

  const editar = <Clave extends keyof Borrador>(
    clave: Clave,
    valor: Borrador[Clave]
  ) => setBorrador((previo) => ({ ...previo, [clave]: valor }))

  const completo = borrador.campo.trim() && borrador.etiqueta.trim()

  const guardar = () => {
    if (!completo) return

    onGuardar(
      {
        motor,
        campo: borrador.campo,
        etiqueta: borrador.etiqueta,
        tipo: borrador.tipo,
        editable: borrador.editable,
        ayuda: borrador.ayuda,
        orden: Number(borrador.orden) || 0,
      },
      campo?.id
    )
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {campo ? "Editar campo" : "Agregar campo"}
          </DialogTitle>
          <DialogDescription>
            Define qué parte del request puede ajustarse antes de volver a
            ejecutar el motor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ruta" className="text-sm font-medium">
              Ruta en el request
            </label>
            <Input
              id="ruta"
              value={borrador.campo}
              onChange={(evento) => editar("campo", evento.target.value)}
              placeholder="solicitante.salario"
              className="font-mono text-xs"
              disabled={guardando}
            />
            <p className="text-[10px] text-muted-foreground">
              Usa puntos para bajar de nivel dentro del JSON.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="etiqueta" className="text-sm font-medium">
              Etiqueta
            </label>
            <Input
              id="etiqueta"
              value={borrador.etiqueta}
              onChange={(evento) => editar("etiqueta", evento.target.value)}
              placeholder="Salario"
              disabled={guardando}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Tipo</span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 justify-between font-normal"
                      disabled={guardando}
                    />
                  }
                >
                  {TIPO_CAMPO_LABEL[borrador.tipo]}
                  <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-36">
                  {TIPOS_CAMPO.map((tipo) => (
                    <DropdownMenuItem
                      key={tipo}
                      onClick={() => editar("tipo", tipo)}
                    >
                      <CheckIcon
                        className={borrador.tipo === tipo ? "" : "opacity-0"}
                      />
                      {TIPO_CAMPO_LABEL[tipo]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="orden" className="text-sm font-medium">
                Orden
              </label>
              <Input
                id="orden"
                type="number"
                value={borrador.orden}
                onChange={(evento) => editar("orden", evento.target.value)}
                disabled={guardando}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ayuda" className="text-sm font-medium">
              Ayuda{" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </label>
            <Input
              id="ayuda"
              value={borrador.ayuda}
              onChange={(evento) => editar("ayuda", evento.target.value)}
              placeholder="Valor mensual antes de deducciones."
              disabled={guardando}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Editable</span>
              <span className="text-[10px] text-muted-foreground">
                Apagado: se muestra en el popup pero bloqueado.
              </span>
            </div>
            <Switch
              checked={borrador.editable}
              onCheckedChange={(marcado) => editar("editable", marcado)}
              disabled={guardando}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" size="sm" disabled={guardando} />}
          >
            Cancelar
          </DialogClose>
          <Button size="sm" onClick={guardar} disabled={!completo || guardando}>
            {guardando ? "Guardando..." : campo ? "Guardar cambios" : "Agregar campo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
