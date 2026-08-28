import {
  derivarEstado,
  esSolicitudEstado,
  parsearEstadoManual,
  type SolicitudEstado,
} from "@/lib/solicitudes/estados"
import type {
  CampoKey,
  CriterioKey,
  Solicitud,
  SolicitudResumen,
} from "@/lib/solicitudes/schema"

// Adaptador: convierte los JSON crudos de los motores de Fondex al modelo que
// consume la bandeja. Todo acceso es defensivo porque los servicios no
// siempre devuelven las mismas claves.
//
// De donde sale cada cosa:
//   validate.response      -> motor1, valida_id/valida_email/valida_celular/
//                             valida_estado_laboral, datos_asociado.{...}
//   motor-data.response    -> detallado.{...}, datos_asociado.{...},
//                             api_responses.linix_109/118/134/136/151
//   motor-process.response -> oferta.{...}, processing.{...}
//   identidad.response     -> status_document / status_face / tipo_validacion
//                             ("success"/1 = ok, "failed"/2 = falla)

type Json = Record<string, unknown>

const comoJson = (valor: unknown): Json =>
  valor && typeof valor === "object" ? (valor as Json) : {}

const comoTexto = (valor: unknown): string =>
  valor === null || valor === undefined || valor === "" ? "—" : String(valor)

const monedaCO = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

/**
 * Formato de moneda. El motor devuelve algunos valores ya formateados
 * ("$0" en cuotaDefinitiva), asi que si llega un texto con $ se respeta.
 */
function moneda(valor: unknown): string {
  if (typeof valor === "string" && valor.trim().startsWith("$")) {
    return valor.trim()
  }
  const numero = Number(valor)
  return Number.isFinite(numero) ? monedaCO.format(numero) : "—"
}

function decimal(valor: unknown, decimales = 2): string {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero.toFixed(decimales) : "—"
}

/**
 * El motor entrega estos indicadores como fraccion (0.29 = 29%, solvencia
 * 0.652 = 65.2%), no como porcentaje ya multiplicado.
 */
function fraccionComoPorcentaje(valor: unknown, decimales = 2): string {
  const numero = Number(valor)
  return Number.isFinite(numero) ? `${(numero * 100).toFixed(decimales)}%` : "—"
}

/** Como fraccionComoPorcentaje, pero con un sufijo propio (" M.V.", " E.A."). */
function porcentajeFraccion(valor: unknown, decimales: number, sufijo: string): string {
  const numero = Number(valor)
  return Number.isFinite(numero)
    ? `${(numero * 100).toFixed(decimales)}${sufijo}`
    : "—"
}

/**
 * Nombre de respaldo cuando los motores no devolvieron ninguno. La cedula es
 * nullable en la base, asi que puede no haber ni eso.
 */
const etiquetaCedula = (cedula: string | null | undefined): string =>
  cedula?.trim() ? `C.C. ${cedula.trim()}` : "Sin identificar"

/**
 * Anos completos entre una fecha (ISO o "YYYY-MM-DD") y hoy. Se usa para
 * edad y antiguedad: el motor no los entrega ya calculados, solo las fechas
 * crudas (fecha_nacimiento, fecha_ingreso_empresa, fecha_antiguedad).
 */
function anosDesde(fecha: unknown): number | null {
  if (typeof fecha !== "string" || !fecha.trim()) return null

  const inicio = new Date(fecha)
  if (Number.isNaN(inicio.getTime())) return null

  const hoy = new Date()
  let anos = hoy.getFullYear() - inicio.getFullYear()
  const aunNoCumple =
    hoy.getMonth() < inicio.getMonth() ||
    (hoy.getMonth() === inicio.getMonth() && hoy.getDate() < inicio.getDate())
  if (aunNoCumple) anos -= 1

  return anos >= 0 ? anos : null
}

/** "52177381_260819213644" -> "19/08/2026 21:36" */
function fechaDeRadicado(radicado: string): string {
  const marca = radicado.split("_")[1]
  if (!marca || marca.length < 12) return "—"

  const [aa, mm, dd, hh, mi] = [
    marca.slice(0, 2),
    marca.slice(2, 4),
    marca.slice(4, 6),
    marca.slice(6, 8),
    marca.slice(8, 10),
  ]
  return `${dd}/${mm}/20${aa} ${hh}:${mi}`
}

/**
 * Datos de tarjeta a partir de columnas livianas. No recibe los JSON de
 * motor_data (cientos de KB): el estado lo derivo Postgres con las mismas
 * reglas de estados.ts, y el nombre y el monto los extrajo de los payloads.
 */
export function mapearResumen(fila: {
  radicado: string
  cedula: string | null
  estado: string
  nombre?: string | null
  monto?: string | null
}): SolicitudResumen {
  return {
    radicado: fila.radicado,
    nombre: fila.nombre?.trim() || etiquetaCedula(fila.cedula),
    cedula: fila.cedula ?? "—",
    monto: fila.monto?.trim() || "—",
    fecha: fechaDeRadicado(fila.radicado),
    // La columna estado_manual es texto libre para Postgres: si trae algo que
    // no es un estado valido, la solicitud cae a revision.
    estado: esSolicitudEstado(fila.estado) ? fila.estado : "revision",
  }
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
})

export type FilasSolicitud = {
  radicado: string
  cedula: string | null
  gestionado_at?: Date | null
  gestionado_by?: string | null
  gestionado_nota?: string | null
  /** Override manual: si trae un estado valido, gana sobre las reglas. */
  estado_manual?: string | null
  validate?: { request_json?: unknown; response_json?: unknown } | null
  motorData?: { request_json?: unknown; response_json?: unknown } | null
  motorProcess?: { request_json?: unknown; response_json?: unknown } | null
  identidad?: { request_json?: unknown; response_json?: unknown } | null
  /** req_143 de credit_tracking: "E" preaprobado, "A" aprobado, "C" contabilizado. */
  estado143?: string | null
}

export function mapearSolicitud(filas: FilasSolicitud): Solicitud {
  const validateRes = comoJson(filas.validate?.response_json)
  const motorDataRes = comoJson(filas.motorData?.response_json)
  const motorProcessRes = comoJson(filas.motorProcess?.response_json)
  const identidadRes = comoJson(filas.identidad?.response_json)

  // Valida 1 trae las banderas de cumplimiento sueltas y la ficha del
  // asociado en `datos_asociado`; motor-data trae la ficha ampliada en su
  // propio `datos_asociado` y el detalle (score, cedula) en `detallado`.
  const asociadoValida1 = comoJson(validateRes.datos_asociado)
  const asociadoMotor = comoJson(motorDataRes.datos_asociado)
  const apiResponses = comoJson(motorDataRes.api_responses)
  const oferta = comoJson(motorProcessRes.oferta)
  const proceso = comoJson(motorProcessRes.processing)

  // linix_109/118/134/136/151: arreglos de una sola fila con datos crudos del
  // core Linix. Se usan solo cuando motor-data no los trajo ya resumidos en
  // datos_asociado (que es el caso normal).
  const linix109 = comoJson((apiResponses.linix_109 as Json[] | undefined)?.[0])
  const linix118 = comoJson((apiResponses.linix_118 as Json[] | undefined)?.[0])
  const linix134 = comoJson((apiResponses.linix_134 as Json[] | undefined)?.[0])

  const paso1 = Number(validateRes.motor1) === 1
  const hayProcess = Object.keys(proceso).length > 0 || Object.keys(oferta).length > 0

  const numeroONulo = (valor: unknown): number | null =>
    valor === undefined || valor === null ? null : Number(valor)

  // Las mismas reglas que aplica el SQL de la bandeja, pero sobre los payloads
  // ya cargados. La existencia de cada paso se infiere de que su fila trajo
  // JSON: obtenerSolicitud pasa null cuando la relacion no existe.
  const estado = derivarEstado({
    motor1: numeroONulo(validateRes.motor1),
    existeIdentidad: Boolean(filas.identidad),
    statusFace: numeroONulo(identidadRes.status_face),
    statusDocument: numeroONulo(identidadRes.status_document),
    tipoValidacion: numeroONulo(identidadRes.tipo_validacion),
    existeMotorData: Boolean(filas.motorData),
    motorProcessStatus:
      typeof motorProcessRes.status === "string"
        ? motorProcessRes.status.trim().toLowerCase()
        : filas.motorProcess
          ? ""
          : null,
    motor2: numeroONulo(motorProcessRes.motor2),
    estado143: filas.estado143 ?? null,
    estadoManual: parsearEstadoManual(filas.estado_manual),
  })

  // El nombre puede venir de motor-data (datos_asociado.deudor), de valida 1
  // (datos_asociado.nombre_completo) o del request original; si la cedula no
  // existe en la cooperativa no llega ninguno.
  const nombre =
    comoTexto(asociadoMotor.deudor) !== "—" ? String(asociadoMotor.deudor) : ""
  const nombreFinal =
    nombre || (comoTexto(asociadoValida1.nombre_completo) !== "—"
      ? String(asociadoValida1.nombre_completo)
      : "") ||
    etiquetaCedula(filas.cedula)

  const edad = anosDesde(linix134.FECHA_NACIMIENTO)
  const antiguedadEficacia = anosDesde(
    asociadoMotor.fechaEficacia ?? linix109.FECHA_INGRESO_EMPRESA
  )
  const antiguedadFondo = anosDesde(
    asociadoMotor.fechaFondex ?? linix109.FECHA_ANTIGUEDAD
  )

  const campos: Record<CampoKey, string> = {
    // Solicitante
    nombreCompleto: nombreFinal,
    cedula: comoTexto(filas.cedula),
    celular: comoTexto(asociadoValida1.celular ?? asociadoMotor.celular),
    email: comoTexto(asociadoValida1.email ?? asociadoMotor.email),

    // Datos laborales
    edad: edad !== null ? `${edad} años` : "—",
    antiguedadEficacia:
      antiguedadEficacia !== null ? `${antiguedadEficacia} año(s)` : "—",
    antiguedadFondo: antiguedadFondo !== null ? `${antiguedadFondo} año(s)` : "—",
    estadoLaboral: comoTexto(asociadoMotor.estadoEficacia),
    tipoContrato: comoTexto(asociadoMotor.tipoContrato),
    seccion: comoTexto(asociadoMotor.seccionNombre ?? linix118.SECCION),
    salarioBase: moneda(asociadoMotor.salarioBase),
    otrosIngresos: moneda(asociadoMotor.otroSalario),
    creditosVigentes: moneda(asociadoMotor.creditosVigentes),
    aportesSociales: moneda(asociadoMotor.aportes),
    segSocial: moneda(asociadoMotor.segSocial),
    descuentosFondo: moneda(asociadoMotor.descuentosFondo),

    // Solicitud
    lineaCredito: comoTexto(oferta.linea),
    montoAprobado: moneda(oferta.monto),
    plazo: oferta.plazo ? `${oferta.plazo} meses` : "—",
    cuotaMensual: moneda(oferta.cuota_mensual),
    tasaMesVencida: porcentajeFraccion(oferta.tasa_mes_vencida, 4, "% M.V."),
    tasaEfectivaAnual: porcentajeFraccion(oferta.tasa_efectiva_anual, 2, "% E.A."),

    // Analisis financiero
    egresosTotales: moneda(proceso.egresoTotal),
    egresoFamiliar: moneda(proceso.egresoFam),
    solvencia: decimal(proceso.solvencia, 4),
    capacidadPagoDisponible: fraccionComoPorcentaje(proceso.capacPagoDisp),
    cupoMaximo: moneda(proceso.cupoMax),
    disponibleCuota: moneda(proceso.disponibleDesp),

    // Scoring Fondex
    scoreTotal: decimal(proceso.scoreFondex, 2),
    perfilFondex: comoTexto(proceso.perfilFondex),
    puntosEdad: comoTexto(proceso.puntosEdad),
    puntosSalario: comoTexto(proceso.puntoSalario),
    puntosFondex: comoTexto(proceso.puntosFondex),
    puntosCreditos: comoTexto(proceso.puntosCreditos),
    puntosEficacia: comoTexto(proceso.puntosEficacia),
    puntosCaptacion: comoTexto(proceso.puntosCapta),
  }

  const criterios: Record<CriterioKey, boolean> = {
    // Valida 1: el filtro de entrada. 1 = cumple.
    resultadoValidacion1: Number(validateRes.motor1) === 1,
    validaIdentidad: Number(validateRes.valida_id) === 1,
    validaEmail: Number(validateRes.valida_email) === 1,
    validaCelular: Number(validateRes.valida_celular) === 1,
    validaEstadoLaboral: Number(validateRes.valida_estado_laboral) === 1,

    estadoDocumento: Number(identidadRes.status_document) === 1,
    estadoFacial: Number(identidadRes.status_face) === 1,

    // Motor de credito: viabilidad. 1 = cumple, 2 = no cumple.
    viabilidadDefinitiva: Number(proceso.viabilidadDef) === 1,
    viabilidadCriterio1: Number(proceso.viabilidad1) === 1,
  }

  // Valida 1 no entrega una lista de motivos: cuando algo no cumple se arma
  // desde los criterios que fallaron, y el motor aporta su mensaje.
  const motivos: string[] = []

  if (!paso1) {
    const fallas: [boolean, string][] = [
      [criterios.validaIdentidad, "No cumple la validación de identidad."],
      [criterios.validaEmail, "No cumple la validación de email."],
      [criterios.validaCelular, "No cumple la validación de celular."],
      [criterios.validaEstadoLaboral, "No cumple el estado laboral."],
    ]
    for (const [cumple, motivo] of fallas) {
      if (!cumple) motivos.push(motivo)
    }
    if (motivos.length === 0 && typeof validateRes.mensaje === "string") {
      motivos.push(validateRes.mensaje)
    }
  }

  if (hayProcess && Number(motorProcessRes.motor2) === 2) {
    motivos.push("No viable según el motor de crédito.")
  }

  return {
    radicado: filas.radicado,
    nombre: nombreFinal,
    gestion: filas.gestionado_at
      ? {
          por: filas.gestionado_by ?? "—",
          fecha: FORMATO_FECHA.format(filas.gestionado_at),
          nota: filas.gestionado_nota ?? null,
        }
      : null,
    cedula: comoTexto(filas.cedula),
    monto: moneda(oferta.monto),
    fecha: fechaDeRadicado(filas.radicado),
    estado,
    campos,
    criterios,
    motivos,
    pasosDisponibles: {
      validate: Boolean(filas.validate),
      "motor-data": Boolean(filas.motorData),
      "motor-process": Boolean(filas.motorProcess),
      identidad: Boolean(filas.identidad),
    },
    payloads: {
      validate: {
        request: filas.validate?.request_json,
        response: filas.validate?.response_json,
      },
      "motor-data": {
        request: filas.motorData?.request_json,
        response: filas.motorData?.response_json,
      },
      "motor-process": {
        request: filas.motorProcess?.request_json,
        response: filas.motorProcess?.response_json,
      },
      identidad: {
        request: filas.identidad?.request_json,
        response: filas.identidad?.response_json,
      },
    },
  }
}
