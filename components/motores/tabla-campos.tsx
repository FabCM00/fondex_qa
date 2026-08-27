"use client"

import * as React from "react"

import { DialogoCampo } from "@/components/motores/dialogo-campo"
import { Button } from "@/components/ui/button"
import { DialogoConfirmar } from "@/components/ui/dialogo-confirmar"
import { useNotificaciones } from "@/components/ui/notificaciones"
import {
  borrarCampoEdicion,
  cargarCamposEdicion,
  guardarCampoEdicion,
} from "@/lib/motores/acciones"
import {
  TIPO_CAMPO_LABEL,
  type CampoEdicion,
  type EntradaCampo,
} from "@/lib/motores/schema"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

const CABECERAS = ["Ruta", "Etiqueta", "Tipo", "Editable", "Orden", "Acciones"]

export function TablaCampos({
  motor,
  inicial,
}: {
  motor: string
  inicial: CampoEdicion[]
}) {
  const { notificar } = useNotificaciones()
  const [campos, setCampos] = React.useState(inicial)
  const [editando, setEditando] = React.useState<CampoEdicion | null>(null)
  const [creando, setCreando] = React.useState(false)
  const [porEliminar, setPorEliminar] = React.useState<CampoEdicion | null>(null)
  const [guardando, setGuardando] = React.useState(false)

  const recargar = async () => setCampos(await cargarCamposEdicion(motor))

  const guardar = async (entrada: EntradaCampo, id?: string) => {
    setGuardando(true)
    const resultado = await guardarCampoEdicion(entrada, id)
    setGuardando(false)

    notificar(resultado.mensaje, resultado.ok ? "exito" : "error")

    if (resultado.ok) {
      setCreando(false)
      setEditando(null)
      await recargar()
    }
  }

  const eliminar = async (campo: CampoEdicion) => {
    setPorEliminar(null)
    const resultado = await borrarCampoEdicion(campo.id)
    notificar(resultado.mensaje, resultado.ok ? "exito" : "error")
    if (resultado.ok) await recargar()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {campos.length === 0
            ? "Sin campos configurados."
            : `${campos.length} ${campos.length === 1 ? "campo" : "campos"} configurados.`}
        </p>
        <Button size="sm" onClick={() => setCreando(true)}>
          <PlusIcon />
          Agregar campo
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {CABECERAS.map((cabecera) => (
                <th
                  key={cabecera}
                  className="px-3 py-2.5 text-start text-xs font-medium text-muted-foreground"
                >
                  {cabecera}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campos.length === 0 && (
              <tr>
                <td
                  colSpan={CABECERAS.length}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  Agrega el primer campo para habilitar la edición del motor.
                </td>
              </tr>
            )}

            {campos.map((campo) => (
              <tr key={campo.id} className="border-t">
                <td className="px-3 py-2.5 font-mono text-xs">{campo.campo}</td>
                <td className="px-3 py-2.5">{campo.etiqueta}</td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {TIPO_CAMPO_LABEL[campo.tipo]}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    data-activo={campo.editable || undefined}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground data-activo:bg-primary/10 data-activo:text-primary"
                  >
                    {campo.editable ? "Sí" : "No"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {campo.orden}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      onClick={() => setEditando(campo)}
                      aria-label={`Editar ${campo.etiqueta}`}
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setPorEliminar(campo)}
                      aria-label={`Eliminar ${campo.etiqueta}`}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creando && (
        <DialogoCampo
          abierto
          onOpenChange={setCreando}
          motor={motor}
          campo={null}
          onGuardar={guardar}
          guardando={guardando}
        />
      )}

      {editando && (
        <DialogoCampo
          key={editando.id}
          abierto
          onOpenChange={(abierto) => !abierto && setEditando(null)}
          motor={motor}
          campo={editando}
          onGuardar={guardar}
          guardando={guardando}
        />
      )}

      <DialogoConfirmar
        abierto={!!porEliminar}
        onOpenChange={(abierto) => !abierto && setPorEliminar(null)}
        titulo="Eliminar campo"
        descripcion={
          <>
            Se quitará{" "}
            <span className="font-medium text-foreground">
              {porEliminar?.etiqueta}
            </span>{" "}
            del popup de edición. No afecta las ejecuciones ya guardadas.
          </>
        }
        textoConfirmar="Eliminar"
        onConfirmar={() => porEliminar && eliminar(porEliminar)}
      />
    </div>
  )
}
