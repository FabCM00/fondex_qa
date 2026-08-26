import { Skeleton } from "@/components/ui/skeleton"

/**
 * Esqueletos de la bandeja. En vez de un spinner o un "Cargando...", cada uno
 * calca la forma de lo que va a llegar: la pagina no salta cuando aparecen los
 * datos reales.
 *
 * Se usan con el flag de carga que ya expone cada vista:
 *
 *   {bandeja.cargando ? <EsqueletoLista /> : <lista real />}
 *   {cargandoDetalle ? <EsqueletoDetalle /> : <detalle real />}
 *
 * `filas` permite ajustar cuantas pintar sin tocar el componente.
 */

/** Una tarjeta de la lista: nombre, fecha, radicado y la etiqueta de estado. */
function EsqueletoTarjeta() {
  return (
    <div className="flex flex-col gap-2 border-b p-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24 shrink-0" />
      </div>
      <Skeleton className="h-3 w-56" />
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-20 shrink-0 rounded-full" />
      </div>
    </div>
  )
}

/**
 * La lista de solicitudes. Se pinta al cambiar de pestana (activas ↔
 * gestionadas), al filtrar por estado y al buscar.
 */
export function EsqueletoLista({ filas = 6 }: { filas?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando solicitudes…</span>
      {Array.from({ length: filas }, (_, i) => (
        <EsqueletoTarjeta key={i} />
      ))}
    </div>
  )
}

/** Un bloque de pares etiqueta/valor, como los de las secciones del resumen. */
function EsqueletoSeccion({ campos }: { campos: number }) {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-3 w-32" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: campos }, (_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * El detalle de una solicitud: encabezado, pestanas y las secciones del
 * resumen. Se pinta al abrir una solicitud, mientras llegan los JSON de los
 * motores (cientos de KB, por eso no vienen con la lista).
 */
export function EsqueletoDetalle() {
  return (
    <div
      className="flex flex-1 flex-col gap-6 p-4 md:p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Cargando la solicitud…</span>

      {/* Encabezado: nombre, estado y accion */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="ms-auto h-8 w-36 rounded-md" />
        </div>
        <Skeleton className="h-3 w-72" />
      </div>

      {/* Pestanas */}
      <div className="flex gap-2 border-b pb-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-md" />
        ))}
      </div>

      <EsqueletoSeccion campos={6} />
      <EsqueletoSeccion campos={10} />

      {/* Grupos de criterios */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-40" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Los contadores por estado del panel de filtros. */
export function EsqueletoFiltros({ filas = 9 }: { filas?: number }) {
  return (
    <div className="flex flex-col gap-1 p-2" aria-busy="true">
      <span className="sr-only">Cargando filtros…</span>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-2 px-2 py-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-6 shrink-0" />
        </div>
      ))}
    </div>
  )
}
