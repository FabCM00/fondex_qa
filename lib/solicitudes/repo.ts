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

// valida1_results es la tabla padre: desde ahi se traen las tres relaciones.
//
// motor_data_results es 1:N en la base (una solicitud puede reprocesarse), asi
// que llega como arreglo: se toma el envio mas reciente.
const RELACIONES = {
  motor_data_results: { orderBy: { updated_at: "desc" }, take: 1 },
  motor_process_results: true,
  identity_validations: true,
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
 * El nombre de la tarjeta. Viene partido en tres columnas del JSON de
 * motor-data (`detallado_want`), y si esa solicitud no llego al motor se cae a
 * la ficha de valida 1 (`datos_asociado`). Se arma en SQL para no traer los
 * response_json completos al listar.
 */
const SQL_NOMBRE = `
  nullif(trim(concat_ws(' ',
    coalesce(md.response_json->'detallado_want'->>'nombre',
             v.response_json->'datos_asociado'->>'nombre'),
    coalesce(md.response_json->'detallado_want'->>'primer_apellido',
             v.response_json->'datos_asociado'->>'primer_apellido'),
    coalesce(md.response_json->'detallado_want'->>'segundo_apellido',
             v.response_json->'datos_asociado'->>'segundo_apellido')
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
      CASE WHEN (v.response_json->'result'->>'valida1') = '1'
           THEN 'valida_1' ELSE 'no_valida_1' END

    WHEN md.radicado IS NULL THEN
      CASE
        WHEN lower(coalesce(iv.response_json->>'status_face', '')) IN ('1', 'success')
             AND (
               ((iv.response_json->>'tipo_validacion') = '1'
                AND lower(coalesce(iv.response_json->>'status_document', '')) IN ('1', 'success'))
               OR (iv.response_json->>'tipo_validacion') = '2'
             )
          THEN 'val_identidad'
        WHEN lower(coalesce(iv.response_json->>'status_document', '')) IN ('2', 'failed')
             OR lower(coalesce(iv.response_json->>'status_face', '')) IN ('2', 'failed')
          THEN 'no_val_identidad'
        ELSE 'revision'
      END

    WHEN mp.radicado IS NULL
         OR lower(trim(coalesce(mp.response_json->>'status', ''))) <> 'ok'
      THEN 'fallo_servicios'

    WHEN (mp.response_json->'processing'->>'instanciaAprobacion') = '2' THEN 'no_viable'
    WHEN (mp.response_json->'processing'->>'instanciaAprobacion') = '1' THEN 'preaprobado'

    ELSE 'revision'
  END`

/**
 * Los JOIN que necesita SQL_ESTADO. motor_data es 1:N (una solicitud puede
 * reprocesarse), asi que se toma el envio mas reciente.
 */
const SQL_JOINS = `
    LEFT JOIN identity_validations iv  ON iv.radicado = v.radicado
    LEFT JOIN motor_process_results mp ON mp.radicado = v.radicado
    LEFT JOIN LATERAL (
      SELECT radicado, response_json
      FROM motor_data_results
      WHERE radicado = v.radicado
      ORDER BY updated_at DESC
      LIMIT 1
    ) md ON true`

/**
 * Que separa las dos pestanas: una solicitud esta "gestionada" cuando alguien
 * le puso el estado a mano (estado_manual). Todo lo demas sigue activo, sin
 * importar en que etapa del flujo lo dejaron las reglas: que una solicitud sea
 * `no_viable` o `no_valida_1` no significa que alguien ya la haya revisado.
 */
const SQL_GESTIONADA = `(v.estado_manual IS NOT NULL)`

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
      (${SQL_ESTADO})                                        AS estado,
      ${SQL_NOMBRE}                                          AS nombre,
      md.response_json->'detallado_want'->>'montoSolicitado' AS monto
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
    // El include trae solo el mas reciente (take: 1), pero sigue siendo arreglo.
    motorData: fila.motor_data_results[0] ?? null,
    motorProcess: fila.motor_process_results,
    identidad: fila.identity_validations,
  })
}

export { ESTADOS_ACTIVOS }
