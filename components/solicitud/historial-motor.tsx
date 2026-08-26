"use client"

import * as React from "react"

import { JsonViewer } from "@/components/json-viewer"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Titulo } from "@/components/solicitud/etiqueta"
import { cargarHistorialMotor } from "@/lib/solicitudes/acciones"
import {
  ChevronDownIcon,
  CodeIcon,
  CpuIcon,
  HistoryIcon,
  UserIcon,
} from "lucide-react"

type Ejecucion = {
  id: string
  request_json: unknown
  response_json: unknown
  ejecutado_por: string | null
  created_at: Date
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
})

const monedaCO = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
})

/** Muestra los numeros grandes con separadores; el resto tal cual. */
function comoTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "—"
  if (typeof valor === "number") {
    return Math.abs(valor) >= 1000 ? monedaCO.format(valor) : String(valor)
  }
  if (typeof valor === "object") return JSON.stringify(valor)
  return String(valor)
}

/**
 * El veredicto del motor en esa ejecucion. Es lo que hace util la tabla: se ve
 * de un golpe si una version cambio la decision.
 */
function conceptoDe(response: unknown): string {
  const raiz =
    response && typeof response === "object"
      ? (response as Record<string, unknown>)
      : {}
  const processing =
    raiz.processing && typeof raiz.processing === "object"
      ? (raiz.processing as Record<string, unknown>)
      : {}

  const concepto = processing.conceptoDefinitivo
  return typeof concepto === "string" && concepto.trim() ? concepto : "—"
}

/**
 * Los campos que cambiaron entre dos versiones del request. No se guarda en la
 * base: se calcula aqui comparando `detallado_want`, que es donde viven los
 * datos que el colaborador edita.
 */
function calcularDiff(anterior: unknown, actual: unknown) {
  const desdeWant = (valor: unknown): Record<string, unknown> => {
    const raiz =
      valor && typeof valor === "object" ? (valor as Record<string, unknown>) : {}
    const want = raiz.detallado_want
    return want && typeof want === "object"
      ? (want as Record<string, unknown>)
      : raiz
  }

  const antes = desdeWant(anterior)
  const ahora = desdeWant(actual)

  const claves = new Set([...Object.keys(antes), ...Object.keys(ahora)])
  const cambios: { campo: string; antes: unknown; ahora: unknown }[] = []

  for (const clave of claves) {
    if (JSON.stringify(antes[clave]) !== JSON.stringify(ahora[clave])) {
      cambios.push({ campo: clave, antes: antes[clave], ahora: ahora[clave] })
    }
  }

  return cambios.sort((a, b) => a.campo.localeCompare(b.campo))
}

/**
 * Historial de ejecuciones del motor para una solicitud.
 *
 * Las filas llegan de la mas reciente a la mas antigua; el diff de cada una se
 * calcula contra la siguiente del arreglo (la version que reemplazo). La ultima
 * es la que produjo el motor automatico y no tiene con que compararse.
 */
export function HistorialMotor({
  radicado,
  /** Cambia tras ejecutar el motor para forzar la recarga. */
  refresco = 0,
}: {
  radicado: string
  refresco?: number
}) {
  const [ejecuciones, setEjecuciones] = React.useState<Ejecucion[] | null>(null)
  const [abierta, setAbierta] = React.useState<string | null>(null)
  // La ejecucion cuyos payloads se estan viendo en el dialogo.
  const [verJson, setVerJson] = React.useState<Ejecucion | null>(null)
  const [direccion, setDireccion] = React.useState<"request" | "response">(
    "request"
  )

  // Al cambiar de solicitud (o tras ejecutar el motor) se vuelve a cargar. El
  // `null` se pone durante el render, no en el efecto: asi el esqueleto sale de
  // inmediato sin provocar un segundo render en cascada.
  const clave = `${radicado}|${refresco}`
  const [clavePrevia, setClavePrevia] = React.useState(clave)

  if (clave !== clavePrevia) {
    setClavePrevia(clave)
    setEjecuciones(null)
    setAbierta(null)
  }

  React.useEffect(() => {
    let vigente = true

    cargarHistorialMotor(radicado).then((filas) => {
      if (vigente) setEjecuciones(filas)
    })

    return () => {
      vigente = false
    }
  }, [radicado, refresco])

  if (ejecuciones === null) {
    return (
      <section className="flex flex-col gap-3">
        <Titulo>Historial de ejecuciones</Titulo>
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </section>
    )
  }

  if (ejecuciones.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <Titulo>Historial de ejecuciones</Titulo>
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          El motor no se ha vuelto a ejecutar para esta solicitud.
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <HistoryIcon className="size-3.5 text-muted-foreground" />
        <Titulo>
          Historial de ejecuciones ({ejecuciones.length})
        </Titulo>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-muted/40">
            <tr className="text-[10px] tracking-[0.08em] text-muted-foreground uppercase">
              <th className="px-3 py-2 font-medium">Ejecutado por</th>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Concepto</th>
              <th className="px-3 py-2 font-medium">Cambios</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {ejecuciones.map((ejecucion, indice) => {
              // La siguiente del arreglo es la version anterior en el tiempo.
              const previa = ejecuciones[indice + 1]
              const cambios = previa
                ? calcularDiff(previa.request_json, ejecucion.request_json)
                : []
              const esAutomatica = !ejecucion.ejecutado_por
              const estaAbierta = abierta === ejecucion.id
              const concepto = conceptoDe(ejecucion.response_json)

              return (
                <React.Fragment key={ejecucion.id}>
                  <tr className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        {esAutomatica ? (
                          <CpuIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <UserIcon className="size-3.5 shrink-0 text-primary" />
                        )}
                        <span className="truncate font-medium">
                          {esAutomatica
                            ? "Motor automático"
                            : ejecucion.ejecutado_por}
                        </span>
                        {indice === 0 && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Vigente
                          </span>
                        )}
                      </span>
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground tabular-nums">
                      {FORMATO_FECHA.format(new Date(ejecucion.created_at))}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">{concepto}</td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      {cambios.length > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setAbierta(estaAbierta ? null : ejecucion.id)
                          }
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          {cambios.length}{" "}
                          {cambios.length === 1 ? "campo" : "campos"}
                          <ChevronDownIcon
                            className={`size-3 transition-transform ${
                              estaAbierta ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-end whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-1.5 text-[11px]"
                        onClick={() => setVerJson(ejecucion)}
                      >
                        <CodeIcon className="size-3" />
                        Ver JSON
                      </Button>
                    </td>
                  </tr>

                  {/* Que cambio respecto a la version anterior. */}
                  {estaAbierta && (
                    <tr className="border-b bg-muted/30 last:border-b-0">
                      <td colSpan={5} className="px-3 py-2">
                        <dl className="grid gap-x-6 gap-y-0.5 text-[11px] sm:grid-cols-2">
                          {cambios.map((cambio) => (
                            <div
                              key={cambio.campo}
                              className="flex flex-wrap items-baseline gap-x-2"
                            >
                              <dt className="font-mono text-muted-foreground">
                                {cambio.campo}
                              </dt>
                              <dd className="flex items-baseline gap-1.5 tabular-nums">
                                <span className="text-red-700 line-through dark:text-red-400">
                                  {comoTexto(cambio.antes)}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                  {comoTexto(cambio.ahora)}
                                </span>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Los payloads completos de una version anterior, en solo lectura: es
          historia, no se edita. */}
      <Dialog
        open={verJson !== null}
        onOpenChange={(abierto) => !abierto && setVerJson(null)}
      >
        <DialogContent className="flex h-[90vh] w-[92vw] max-w-7xl flex-col gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {verJson?.ejecutado_por ?? "Motor automático"}
              <span className="ms-2 font-normal text-muted-foreground">
                {verJson &&
                  FORMATO_FECHA.format(new Date(verJson.created_at))}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex shrink-0 gap-1">
            {(["request", "response"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDireccion(item)}
                data-active={direccion === item || undefined}
                className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-active:border-primary data-active:bg-primary/10 data-active:font-medium data-active:text-foreground"
              >
                {item === "request" ? "Request" : "Response"}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1">
            <JsonViewer
              value={
                direccion === "request"
                  ? (verJson?.request_json ?? null)
                  : (verJson?.response_json ?? null)
              }
              etiqueta={`motor_ejecuciones · ${direccion}_json`}
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
