"use client"

import { Titulo } from "@/components/solicitud/etiqueta"
import { GRUPOS, SECCIONES, type Solicitud } from "@/lib/solicitudes/schema"
import { CircleCheckIcon, CircleXIcon } from "lucide-react"

function Progreso({ cumplen, total }: { cumplen: number; total: number }) {
  const porcentaje = total === 0 ? 0 : Math.round((cumplen / total) * 100)
  const color =
    cumplen === total
      ? "bg-emerald-500"
      : cumplen === 0
        ? "bg-red-500"
        : "bg-primary"

  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${color}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {cumplen}/{total} cumplen
      </span>
    </div>
  )
}

export function TabResumen({ solicitud }: { solicitud: Solicitud }) {
  return (
    <div className="flex flex-col gap-6">
      {SECCIONES.map((seccion) => (
        <section key={seccion.titulo}>
          <Titulo>{seccion.titulo}</Titulo>
          <dl className="grid grid-cols-1 border-s border-t sm:grid-cols-2">
            {seccion.campos.map((campo) => (
              <div key={campo.key} className="border-b border-e px-4 py-2.5">
                <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
                  {campo.label}
                </dt>
                <dd className="truncate text-sm font-medium tabular-nums">
                  {solicitud.campos[campo.key]}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {GRUPOS.map((grupo) => {
        const cumplen = grupo.criterios.filter(
          (criterio) => solicitud.criterios[criterio.key]
        ).length

        return (
          <section key={grupo.titulo}>
            <Titulo>{grupo.titulo}</Titulo>
            <Progreso cumplen={cumplen} total={grupo.criterios.length} />
            <ul className="mt-2">
              {grupo.criterios.map((criterio) => {
                const cumple = solicitud.criterios[criterio.key]
                return (
                  <li
                    key={criterio.key}
                    className={`flex items-center gap-2 border-b px-2 py-2 text-sm last:border-b-0 ${
                      cumple ? "" : "bg-destructive/5"
                    }`}
                  >
                    {cumple ? (
                      <CircleCheckIcon className="size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <CircleXIcon className="size-4 shrink-0 text-red-600" />
                    )}
                    <span className="truncate">{criterio.nombre}</span>
                    <span
                      className={`ms-auto shrink-0 text-xs font-medium ${
                        cumple ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {cumple ? "Cumple" : "No cumple"}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      {/* Rastro de quien la gestiono: solo aparece si ya se gestiono. */}
      {solicitud.gestion && (
        <section>
          <Titulo>Gestión</Titulo>
          <dl className="grid grid-cols-1 border-s border-t sm:grid-cols-2">
            <div className="border-b border-e px-4 py-2.5">
              <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
                Gestionada por
              </dt>
              <dd className="truncate text-sm font-medium">
                {solicitud.gestion.por}
              </dd>
            </div>
            <div className="border-b border-e px-4 py-2.5">
              <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
                Fecha
              </dt>
              <dd className="truncate text-sm font-medium">
                {solicitud.gestion.fecha}
              </dd>
            </div>
            <div className="border-b border-e px-4 py-2.5 sm:col-span-2">
              <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
                Observación
              </dt>
              <dd className="text-sm">
                {solicitud.gestion.nota ?? (
                  <span className="text-muted-foreground italic">
                    Sin observación
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <section>
        <Titulo>Motivos no apto</Titulo>
        {solicitud.motivos.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Sin motivos de rechazo registrados.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {solicitud.motivos.map((motivo) => (
              <li key={motivo} className="flex items-start gap-2 text-sm">
                <CircleXIcon className="mt-0.5 size-4 shrink-0 text-red-600" />
                {motivo}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
