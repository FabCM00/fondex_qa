"use client"

import * as React from "react"

import { Titulo } from "@/components/solicitud/etiqueta"
import { Switch } from "@/components/ui/switch"

const OPCIONES = [
  {
    id: "nuevas",
    titulo: "Solicitudes nuevas",
    descripcion: "Avísame cuando entre una solicitud a la bandeja.",
    porDefecto: true,
  },
  {
    id: "motor",
    titulo: "Resultado del motor",
    descripcion: "Cuando el motor de crédito termine de evaluar un radicado.",
    porDefecto: true,
  },
  {
    id: "identidad",
    titulo: "Validación de identidad",
    descripcion: "Cuando falle la validación documental o facial.",
    porDefecto: false,
  },
  {
    id: "resumen",
    titulo: "Resumen diario",
    descripcion: "Un correo al cierre del día con lo gestionado.",
    porDefecto: false,
  },
]

export function VistaNotificaciones() {
  const [activas, setActivas] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(OPCIONES.map((o) => [o.id, o.porDefecto]))
  )

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto px-6 py-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <section>
          <Titulo>Notificaciones</Titulo>
          <div className="rounded-lg border">
            {OPCIONES.map((opcion) => (
              <div
                key={opcion.id}
                className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{opcion.titulo}</span>
                  <span className="text-xs text-muted-foreground">
                    {opcion.descripcion}
                  </span>
                </div>
                <Switch
                  className="ms-auto shrink-0"
                  checked={activas[opcion.id]}
                  onCheckedChange={(valor) =>
                    setActivas((prev) => ({ ...prev, [opcion.id]: valor }))
                  }
                  aria-label={opcion.titulo}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
