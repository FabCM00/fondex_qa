"use client"

import * as React from "react"

import { DialogoCampo } from "@/components/motores/dialogo-campo"
import { Button } from "@/components/ui/button"
import { DialogoConfirmar } from "@/components/ui/dialogo-confirmar"
import { Input } from "@/components/ui/input"
import { useNotificaciones } from "@/components/ui/notificaciones"
import {
  borrarCampoEdicion,
  cargarCamposEdicion,
  guardarCampoEdicion,
} from "@/lib/motores/acciones"
import {
  TIPO_CAMPO_LABEL,
  TIPOS_CAMPO,
  type CampoEdicion,
  type EntradaCampo,
  type TipoCampo,
} from "@/lib/motores/schema"
import {
  ListFilterIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

const CABECERAS = ["Ruta", "Etiqueta", "Tipo", "Editable", "Ayuda", "Orden", "Acciones"]

type Editable = "todos" | "si" | "no"

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
  const [porEliminar, setPorEliminar] = React.useState<CampoEdicion | null>(
    null
  )
  const [guardando, setGuardando] = React.useState(false)

  // Filtros: busqueda general + por columna.
  const [busqueda, setBusqueda] = React.useState("")
  const [filtrosOpen, setFiltrosOpen] = React.useState(false)
  const [filtroRuta, setFiltroRuta] = React.useState("")
  const [filtroEtiqueta, setFiltroEtiqueta] = React.useState("")
  const [filtroTipo, setFiltroTipo] = React.useState<TipoCampo | "todos">(
    "todos"
  )
  const [filtroEditable, setFiltroEditable] = React.useState<Editable>("todos")

  const filtrosActivos =
    (filtroRuta ? 1 : 0) +
    (filtroEtiqueta ? 1 : 0) +
    (filtroTipo !== "todos" ? 1 : 0) +
    (filtroEditable !== "todos" ? 1 : 0)

  const contiene = (valor: string, patron: string) =>
    patron === "" || valor.toLowerCase().includes(patron.trim().toLowerCase())

  const termino = busqueda.trim().toLowerCase()
  const visibles = campos.filter(
    (campo) =>
      (termino === "" ||
        campo.campo.toLowerCase().includes(termino) ||
        campo.etiqueta.toLowerCase().includes(termino)) &&
      contiene(campo.campo, filtroRuta) &&
      contiene(campo.etiqueta, filtroEtiqueta) &&
      (filtroTipo === "todos" || campo.tipo === filtroTipo) &&
      (filtroEditable === "todos" ||
        (filtroEditable === "si" ? campo.editable : !campo.editable))
  )

  const limpiarFiltros = () => {
    setFiltroRuta("")
    setFiltroEtiqueta("")
    setFiltroTipo("todos")
    setFiltroEditable("todos")
  }

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
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="h-9 rounded-full ps-9"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          className="relative size-9 shrink-0"
          aria-label="Filtros"
          aria-expanded={filtrosOpen}
          onClick={() => setFiltrosOpen((valor) => !valor)}
        >
          <ListFilterIcon />
          {filtrosActivos > 0 && (
            <span className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {filtrosActivos}
            </span>
          )}
        </Button>

        <p className="text-sm text-muted-foreground">
          {campos.length === 0
            ? "Sin campos configurados."
            : `${campos.length} ${campos.length === 1 ? "campo" : "campos"} configurados.`}
        </p>

        <Button size="sm" className="ms-auto" onClick={() => setCreando(true)}>
          <PlusIcon />
          Agregar campo
        </Button>
      </div>

      {filtrosOpen && (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Filtrar por campo
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={limpiarFiltros}
              disabled={filtrosActivos === 0}
            >
              <XIcon />
              Limpiar
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Ruta</span>
              <Input
                value={filtroRuta}
                placeholder="Ruta..."
                onChange={(evento) => setFiltroRuta(evento.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Etiqueta</span>
              <Input
                value={filtroEtiqueta}
                placeholder="Etiqueta..."
                onChange={(evento) => setFiltroEtiqueta(evento.target.value)}
              />
            </label>

            <div className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Tipo</span>
              <div className="flex gap-1">
                {(["todos", ...TIPOS_CAMPO] as const).map((opcion) => (
                  <Button
                    key={opcion}
                    variant={filtroTipo === opcion ? "default" : "outline"}
                    size="sm"
                    className="flex-1 capitalize"
                    onClick={() => setFiltroTipo(opcion)}
                  >
                    {opcion === "todos" ? "Todos" : TIPO_CAMPO_LABEL[opcion]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Editable</span>
              <div className="flex gap-1">
                {(["todos", "si", "no"] as Editable[]).map((opcion) => (
                  <Button
                    key={opcion}
                    variant={filtroEditable === opcion ? "default" : "outline"}
                    size="sm"
                    className="flex-1 capitalize"
                    onClick={() => setFiltroEditable(opcion)}
                  >
                    {opcion}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

            {campos.length > 0 && visibles.length === 0 && (
              <tr>
                <td
                  colSpan={CABECERAS.length}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  Ningún campo coincide con los filtros.
                </td>
              </tr>
            )}

            {visibles.map((campo) => (
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
                  {campo.ayuda}
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
