import "server-only"

import { mapearResumen, mapearSolicitud } from "@/lib/solicitudes/mapear"
import {
  ESTADOS_ACTIVOS,
  esSolicitudEstado,
  type SolicitudEstado,
} from "@/lib/solicitudes/estados"
import {
  POR_PAGINA,
  type PaginaSolicitudes,
  type Solicitud,
} from "@/lib/solicitudes/schema"
import { prisma } from "@/lib/prisma"

// valida1_results es la tabla padre: desde ahi se traen las relaciones.
const RELACIONES = {
  motor_data_results: true,
  motor_process_results: true,
  identity_results: true,
  workflow_results: true,
  credit_tracking: true,
} as const

/** Fila cruda del listado: Postgres ya derivo el estado y extrajo la tarjeta. */
type FilaResumen = {
  radicado: string
  cedula: string | null
  estado: string
  nombre: string | null
  monto: string | null
}

export type FiltroBandeja = {
  /** "activas" son las que siguen en tramite; "gestionadas" los desenlaces. */
  categoria: "activas" | "gestionadas"
  estado?: SolicitudEstado
  busqueda?: string
  pagina?: number
}

const monedaCO = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

/**
 * El nombre de la tarjeta. motor-data trae el nombre completo ya armado en
 * `datos_asociado.deudor`; si la solicitud no llego al motor se cae al de
 * valida 1 (`datos_asociado.nombre_completo`). Se arma en SQL para no traer
 * los response_json completos al listar.
 */
const SQL_NOMBRE = `
  nullif(trim(coalesce(
    md.response_json->'datos_asociado'->>'deudor',
    v.response_json->'datos_asociado'->>'nombre_completo'
  )), '')`

/**
 * Espejo en SQL de `derivarEstado` (lib/solicitudes/estados.ts). Se duplica la
 * logica a proposito: permite filtrar y contar en Postgres sin traer los
 * payloads, que pesan cientos de KB por fila. Si cambias una regla alla,
 * cambiala aqui.
 */
const SQL_ESTADO = `
  CASE
    WHEN v.estado_manual IS NOT NULL THEN v.estado_manual

    WHEN iv.radicado IS NULL THEN
      CASE WHEN (v.response_json->>'motor1') = '1'
           THEN 'valida_1' ELSE 'no_valida_1' END

    WHEN md.radicado IS NULL
         AND (iv.response_json->>'status_face') = '1'
         AND (
           ((iv.response_json->>'tipo_validacion') = '1'
            AND (iv.response_json->>'status_document') = '1')
           OR (iv.response_json->>'tipo_validacion') = '2'
         )
      THEN 'val_identidad'

    WHEN md.radicado IS NULL
         AND ((iv.response_json->>'status_document') = '2'
              OR (iv.response_json->>'status_face') = '2')
      THEN 'no_val_identidad'

    WHEN mp.radicado IS NOT NULL
         AND trim(coalesce(mp.response_json->>'status', '')) <> 'ok'
      THEN 'fallo_servicios'

    WHEN (mp.response_json->>'motor2') = '2' THEN 'no_viable'

    WHEN (mp.response_json->>'motor2') = '1' AND ct.req_143 = 'E' THEN 'preaprobado'
    WHEN (mp.response_json->>'motor2') = '1' AND ct.req_143 = 'A' THEN 'aprobado'
    WHEN (mp.response_json->>'motor2') = '1' AND ct.req_143 = 'C' THEN 'contabilizado'

    ELSE 'revision'
  END`

/** Los JOIN que necesita SQL_ESTADO. Todas las relaciones son 1:1 por radicado. */
const SQL_JOINS = `
    LEFT JOIN identity_results iv       ON iv.radicado = v.radicado
    LEFT JOIN motor_process_results mp  ON mp.radicado = v.radicado
    LEFT JOIN motor_data_results md     ON md.radicado = v.radicado
    LEFT JOIN credit_tracking ct        ON ct.radicado = v.radicado`

/**
 * Que separa las dos pestanas: una solicitud esta "gestionada" cuando alguien
 * la reviso (gestionado_at, lo pone marcarGestionada). Todo lo demas sigue
 * activo, sin importar en que etapa del flujo lo dejaron las reglas: que una
 * solicitud sea `no_viable` o `no_valida_1` no significa que alguien ya la
 * haya revisado.
 */
const SQL_GESTIONADA = `(v.gestionado_at IS NOT NULL)`

/**
 * Una pagina de la bandeja.
 *
 * Clave para el rendimiento: NO se traen los response_json (cientos de KB
 * cada uno). Postgres deriva el estado y extrae con -> y ->> solo el nombre y
 * el monto de la tarjeta; el filtrado y el paginado ocurren en la base.
 */
export async function listarSolicitudes(
  filtro: FiltroBandeja
): Promise<PaginaSolicitudes> {
  const inicio = performance.now()

  const pagina = Math.max(1, filtro.pagina ?? 1)
  const saltar = (pagina - 1) * POR_PAGINA
  const termino = filtro.busqueda?.trim().toLowerCase() ?? ""
  const patron = `%${termino}%`
  const soloActivas = filtro.categoria === "activas"
  const estado = filtro.estado ?? null

  // El estado se deriva, asi que el WHERE lo repite en vez de referenciar el
  // alias del SELECT (Postgres no permite usar alias en WHERE).
  const filtros = `
    WHERE ${SQL_GESTIONADA} = NOT $1::boolean
      AND (
        $2::text = ''
        OR lower(coalesce(${SQL_NOMBRE}, '')) LIKE $3::text
        OR lower(coalesce(v.cedula, '')) LIKE $3::text
        OR lower(v.radicado) LIKE $3::text
      )
      AND ($4::text IS NULL OR $4::text = (${SQL_ESTADO}))`

  const filas: FilaResumen[] = await prisma.$queryRawUnsafe(
    `
    SELECT
      v.radicado,
      v.cedula,
      (${SQL_ESTADO})                            AS estado,
      ${SQL_NOMBRE}                              AS nombre,
      mp.response_json->'oferta'->>'monto'        AS monto
    FROM valida1_results v
    ${SQL_JOINS}
    ${filtros}
    ORDER BY v.updated_at DESC
    LIMIT $5::int OFFSET $6::int
  `,
    soloActivas,
    termino,
    patron,
    estado,
    POR_PAGINA,
    saltar
  )

  // El conteo va aparte para saber cuantas paginas hay.
  const [{ total }]: [{ total: bigint }] = await prisma.$queryRawUnsafe(
    `
    SELECT count(*) AS total
    FROM valida1_results v
    ${SQL_JOINS}
    ${filtros}
  `,
    soloActivas,
    termino,
    patron,
    estado
  )

  const cantidad = Number(total)

  if (process.env.NODE_ENV !== "production") {
    const ms = Math.round(performance.now() - inicio)
    console.log(
      `[bandeja] pagina ${pagina}: ${filas.length} de ${cantidad} en ${ms}ms`
    )
  }

  return {
    solicitudes: filas.map((fila) =>
      mapearResumen({
        radicado: fila.radicado,
        cedula: fila.cedula,
        estado: fila.estado,
        nombre: fila.nombre,
        monto: fila.monto ? monedaCO.format(Number(fila.monto)) : null,
      })
    ),
    total: cantidad,
    pagina,
    totalPaginas: Math.max(1, Math.ceil(cantidad / POR_PAGINA)),
  }
}

/** Cuantas solicitudes hay por estado (para los contadores del filtro). */
export async function contarPorEstado(
  categoria: FiltroBandeja["categoria"]
): Promise<Record<SolicitudEstado | "Todos", number>> {
  const soloActivas = categoria === "activas"

  const filas: { estado: string; total: bigint }[] =
    await prisma.$queryRawUnsafe(
      `
    SELECT (${SQL_ESTADO}) AS estado, count(*) AS total
    FROM valida1_results v
    ${SQL_JOINS}
    WHERE ${SQL_GESTIONADA} = NOT $1::boolean
    GROUP BY 1
  `,
      soloActivas
    )

  const conteo = { Todos: 0 } as Record<SolicitudEstado | "Todos", number>

  for (const fila of filas) {
    const total = Number(fila.total)
    if (esSolicitudEstado(fila.estado)) conteo[fila.estado] = total
    conteo.Todos += total
  }

  return conteo
}

/**
 * Una solicitud completa, con todos los JSON. Solo se llama al abrir el
 * detalle, nunca para la lista.
 */
export async function obtenerSolicitud(
  radicado: string
): Promise<Solicitud | null> {
  const fila = await prisma.valida1_results.findUnique({
    where: { radicado },
    include: RELACIONES,
  })

  if (!fila) return null

  return mapearSolicitud({
    radicado: fila.radicado,
    cedula: fila.cedula,
    gestionado_at: fila.gestionado_at,
    gestionado_by: fila.gestionado_by,
    gestionado_nota: fila.gestionado_nota,
    estado_manual: fila.estado_manual,
    validate: fila,
    motorData: fila.motor_data_results,
    motorProcess: fila.motor_process_results,
    identidad: fila.identity_results,
    workflow: fila.workflow_results,
    estado143: fila.credit_tracking?.req_143 ?? null,
  })
}

export { ESTADOS_ACTIVOS }
