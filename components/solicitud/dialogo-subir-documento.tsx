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
import {
  formatearPeso,
  MAX_BYTES,
  TIPO_POR_DEFECTO,
  TIPOS_DOCUMENTO,
} from "@/lib/documentos/schema"
import {
  FileTextIcon,
  LoaderCircleIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"

/**
 * Modal de carga. El tipo de documento funciona como carpeta: se elige uno de
 * los sugeridos, uno de los que ya se usaron en esta solicitud, o se escribe
 * uno nuevo (la columna es texto libre).
 */
export function DialogoSubirDocumento({
  abierto,
  onOpenChange,
  radicado,
  tiposUsados,
  enviando,
  onConfirmar,
}: {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  radicado: string
  /** Los tipos que ya existen en esta solicitud. */
  tiposUsados: string[]
  enviando: boolean
  onConfirmar: (datos: { tipo: string; archivos: File[] }) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [tipo, setTipo] = React.useState(TIPO_POR_DEFECTO)
  const [archivos, setArchivos] = React.useState<File[]>([])

  // Los sugeridos mas los que ya se usaron, sin repetir.
  const opciones = React.useMemo(
    () => [...new Set([...tiposUsados, ...TIPOS_DOCUMENTO])],
    [tiposUsados]
  )

  const agregar = (evento: React.ChangeEvent<HTMLInputElement>) => {
    setArchivos((previos) => [
      ...previos,
      ...Array.from(evento.target.files ?? []),
    ])
    // Se limpia para poder volver a elegir el mismo archivo.
    evento.target.value = ""
  }

  const quitar = (indice: number) =>
    setArchivos((previos) => previos.filter((_, i) => i !== indice))

  const pesados = archivos.filter((archivo) => archivo.size > MAX_BYTES)
  const puedeEnviar = archivos.length > 0 && pesados.length === 0 && !enviando

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir documentos</DialogTitle>
          <DialogDescription>
            Se guardan en la solicitud {radicado}. PDF o imagen, hasta{" "}
            {formatearPeso(MAX_BYTES)} cada uno.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tipo">Tipo de documento</Label>
            {/* Editable con sugerencias: sirve para elegir una carpeta que ya
                existe o crear una nueva escribiendo. */}
            <Input
              id="tipo"
              list="tipos-documento"
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value)}
              placeholder={TIPO_POR_DEFECTO}
              autoComplete="off"
            />
            <datalist id="tipos-documento">
              {opciones.map((opcion) => (
                <option key={opcion} value={opcion} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Agrupa los documentos como una carpeta. Puedes escribir uno nuevo.
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={agregar}
          />

          {archivos.length === 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors hover:border-primary hover:bg-accent/50"
            >
              <UploadIcon className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                Elige los archivos
              </span>
              <span className="text-xs text-muted-foreground">
                Puedes seleccionar varios a la vez
              </span>
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {archivos.length} archivo
                  {archivos.length === 1 ? "" : "s"} seleccionado
                  {archivos.length === 1 ? "" : "s"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => inputRef.current?.click()}
                  disabled={enviando}
                >
                  <UploadIcon className="size-3.5" />
                  Agregar más
                </Button>
              </div>

              <ul className="max-h-48 overflow-y-auto rounded-lg border">
                {archivos.map((archivo, indice) => {
                  const pesado = archivo.size > MAX_BYTES

                  return (
                    <li
                      key={`${archivo.name}-${indice}`}
                      className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0"
                    >
                      <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm">{archivo.name}</span>
                      <span
                        className={`ms-auto shrink-0 text-xs tabular-nums ${
                          pesado
                            ? "font-medium text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatearPeso(archivo.size)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-6 shrink-0"
                        aria-label={`Quitar ${archivo.name}`}
                        onClick={() => quitar(indice)}
                        disabled={enviando}
                      >
                        <XIcon />
                      </Button>
                    </li>
                  )
                })}
              </ul>

              {pesados.length > 0 && (
                <p className="text-xs font-medium text-destructive">
                  Quita los archivos que superan {formatearPeso(MAX_BYTES)}.
                </p>
              )}
            </div>
          )}
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
              onConfirmar({ tipo: tipo.trim() || TIPO_POR_DEFECTO, archivos })
            }
            disabled={!puedeEnviar}
          >
            {enviando && <LoaderCircleIcon className="size-4 animate-spin" />}
            {enviando ? "Subiendo..." : "Subir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
