"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { CheckIcon, CopyIcon, LoaderCircleIcon } from "lucide-react"

// Se usa mientras se descarga el bundle de Monaco y mientras el editor arranca.
function CargandoEditor() {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2">
      <LoaderCircleIcon className="size-5 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground">Cargando editor...</p>
    </div>
  )
}

// Monaco solo funciona en el cliente.
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <CargandoEditor />,
})

// Visor generico: recibe cualquier valor serializable, no sabe nada de
// solicitudes. Sirve igual cuando el JSON venga de la base de datos.
//
// Con `onChange` pasa a ser editable: el padre recibe el texto crudo (no el
// objeto) porque mientras se escribe el JSON esta roto a medias, y decidir que
// hacer con eso es del padre, no del visor.
export function JsonViewer({
  value,
  etiqueta,
  onChange,
  acciones,
}: {
  value: unknown
  etiqueta?: string
  onChange?: (texto: string) => void
  /** Controles extra en la barra, a la izquierda de "Copiar". */
  acciones?: React.ReactNode
}) {
  const { resolvedTheme } = useTheme()
  const [copiado, setCopiado] = React.useState(false)
  const editable = typeof onChange === "function"

  const contenido = React.useMemo(
    () => (typeof value === "string" ? value : JSON.stringify(value, null, 2)),
    [value]
  )

  React.useEffect(() => {
    if (!copiado) return
    const id = setTimeout(() => setCopiado(false), 2000)
    return () => clearTimeout(id)
  }, [copiado])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(contenido)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b bg-muted/40 px-3">
        {etiqueta && (
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            {etiqueta}
          </span>
        )}
        <div className="ms-auto flex items-center gap-1.5">
          {acciones}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={copiar}
          >
            {copiado ? (
              <CheckIcon className="size-3.5 text-emerald-600" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
            {copiado ? "Copiado" : "Copiar JSON"}
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 pt-8">
        <MonacoEditor
          language="json"
          value={contenido}
          onChange={(texto) => onChange?.(texto ?? "")}
          theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
          height="100%"
          loading={<CargandoEditor />}
          options={{
            readOnly: !editable,
            domReadOnly: !editable,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            lineNumbers: "on",
            folding: true,
            renderLineHighlight: editable ? "line" : "none",
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
            overviewRulerLanes: 0,
            find: {
              addExtraSpaceOnTop: true,
              seedSearchStringFromSelection: "never",
            },
            padding: { top: 8, bottom: 12 },
          }}
        />
      </div>
    </div>
  )
}
