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

// Adaptador: convierte los JSON crudos de los motores de Coopvalili al modelo
// que consume la bandeja. Todo acceso es defensivo porque los servicios no
// siempre devuelven las mismas claves.
//
// De donde sale cada cosa:
//   validate.response      -> result.{valida1,valida_edad,valida_activo,
//                             valida_asociado} y datos_asociado.{...}
//   motor-data.response    -> detallado_want.{...}
//   motor-process.response -> processing.{...}
//   identidad.response     -> status_document / status_face / estado_validacion
//                             (1 = ok, 0 = falla)

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

/**
 * Nombre de respaldo cuando los motores no devolvieron ninguno. La cedula es
 * nullable en la base, asi que puede no haber ni eso.
 */
const etiquetaCedula = (cedula: string | null | undefined): string =>
  cedula?.trim() ? `C.C. ${cedula.trim()}` : "Sin identificar"

/** Une los nombres y apellidos que vienen en campos separados. */
function nombreCompleto(fuente: Json): string {
  const partes = [
    fuente.nombre,
    fuente.primer_apellido,
    fuente.segundo_apellido,
  ]
    .map((parte) => (typeof parte === "string" ? parte.trim() : ""))
    .filter(Boolean)

  return partes.join(" ")
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
}

export function mapearSolicitud(filas: FilasSolicitud): Solicitud {
  const validateRes = comoJson(filas.validate?.response_json)
  const motorDataRes = comoJson(filas.motorData?.response_json)
  const motorProcessRes = comoJson(filas.motorProcess?.response_json)
  const identidadRes = comoJson(filas.identidad?.response_json)

  // Valida 1 devuelve los criterios en `result` y la ficha del asociado en
  // `datos_asociado`; motor-data condensa todo en `detallado_want`.
  const resultado = comoJson(validateRes.result)
  const asociado = comoJson(validateRes.datos_asociado)
  const detallado = comoJson(motorDataRes.detallado_want)
  const proceso = comoJson(motorProcessRes.processing)

  const paso1 = Number(resultado.valida1) === 1
  const hayProcess = Object.keys(proceso).length > 0

  // Las mismas reglas que aplica el SQL de la bandeja, pero sobre los payloads
  // ya cargados. La existencia de cada paso se infiere de que su fila trajo
  // JSON: obtenerSolicitud pasa null cuando la relacion no existe.
  const estado = derivarEstado({
    valida1: resultado.valida1 === undefined ? null : Number(resultado.valida1),
    existeIdentidad: Boolean(filas.identidad),
    statusFace: identidadRes.status_face,
    statusDocument: identidadRes.status_document,
    tipoValidacion:
      identidadRes.tipo_validacion === undefined
        ? null
        : Number(identidadRes.tipo_validacion),
    existeMotorData: Boolean(filas.motorData),
    existeMotorProcess: Boolean(filas.motorProcess),
    motorStatus:
      typeof motorProcessRes.status === "string" ? motorProcessRes.status : null,
    motorInstancia:
      proceso.instanciaAprobacion === undefined
        ? null
        : Number(proceso.instanciaAprobacion),
    estadoManual: parsearEstadoManual(filas.estado_manual),
  })

  // El nombre puede venir de motor-data o de la ficha de valida 1; si la cedula
  // no existe en la cooperativa no llega ninguno.
  const nombre =
    nombreCompleto(detallado) ||
    nombreCompleto(asociado) ||
    etiquetaCedula(filas.cedula)

  // `usuarioCredito` es una bandera 1/0 del motor, no un identificador: el
  // numero de usuario esta en la ficha del asociado de motor-data.
  const esUsuarioCredito = Number(proceso.usuarioCredito) === 1

  const campos: Record<CampoKey, string> = {
    // Solicitante
    nombreCompleto: nombre,
    cedula: comoTexto(filas.cedula),
    edad: detallado.edad ? `${detallado.edad} años` : "—",
    antiguedadLaboral: detallado.antiguedadLaboral
      ? `${decimal(detallado.antiguedadLaboral, 1)} años`
      : "—",
    celular: comoTexto(asociado.celular),
    email: comoTexto(asociado.email),

    // Solicitud
    montoSolicitado: moneda(detallado.montoSolicitado),
    lineaCredito: comoTexto(detallado.lineaCredito),
    perfil: comoTexto(proceso.perfil),
    salario: moneda(detallado.salario),
    egresosVolante: moneda(
      proceso.egresosvolanteAjustado ?? detallado.egresosVolante
    ),
    deudaCooperativa: moneda(detallado.deudaCoopvalili),
    conceptoDefinitivo: comoTexto(proceso.conceptoDefinitivo),
    cuotaDefinitiva: moneda(proceso.cuotaDefinitiva),
    frecuenciaPago: comoTexto(detallado.frecuenciaPagos),
    usuarioCredito: hayProcess ? (esUsuarioCredito ? "Sí" : "No") : "—",

    // Analisis del motor
    ingresos: moneda(proceso.ingresos),
    egresos: moneda(proceso.egresos),
    minimoVital: moneda(proceso.minimoVital),
    solvencia: fraccionComoPorcentaje(proceso.solvencia),
    desprotegido: moneda(proceso.desprotegido),
    disponible: moneda(proceso.disponible),
    endeudamientoActual: fraccionComoPorcentaje(proceso.endActual),
    endeudamientoProyectado: fraccionComoPorcentaje(proceso.endProyectado),
  }

  const criterios: Record<CriterioKey, boolean> = {
    // Valida 1: el filtro de entrada. 1 = cumple.
    valida1Inicial: Number(resultado.valida1) === 1,
    validaEdad: Number(resultado.valida_edad) === 1,
    validaActivo: Number(resultado.valida_activo) === 1,
    validaAsociado: Number(resultado.valida_asociado) === 1,

    // Identidad: el servicio normaliza los "success" del request a 1/0.
    estadoDocumento: Number(identidadRes.status_document) === 1,
    estadoFacial: Number(identidadRes.status_face) === 1,
    estadoGeneral: Number(identidadRes.estado_validacion) === 1,

    // Motor de credito: las banderas de politica. 1 = cumple, 2 = no cumple.
    cumpleEndeudamiento: Number(proceso.cumpleEnd) === 1,
    cumpleSolvencia: Number(proceso.cumpleSol) === 1,
    cumpleDisponible: Number(proceso.cumpleDis) === 1,
    cumpleDesprotegido: Number(proceso.cumpleDes) === 1,
    cumple4Criterios: Number(proceso.cumpl4Criterios) === 1,
  }

  // Valida 1 no entrega una lista de motivos: cuando algo no cumple se arma
  // desde los criterios que fallaron, y el motor aporta su concepto.
  const motivos: string[] = []

  if (!paso1) {
    const fallas: [boolean, string][] = [
      [criterios.validaEdad, "No cumple la validación de edad."],
      [criterios.validaActivo, "El asociado no está activo."],
      [criterios.validaAsociado, "No figura como asociado de la cooperativa."],
    ]
    for (const [cumple, motivo] of fallas) {
      if (!cumple) motivos.push(motivo)
    }
    if (motivos.length === 0 && typeof resultado.mensaje === "string") {
      motivos.push(resultado.mensaje)
    }
  }

  if (hayProcess && proceso.conceptoDefinitivo === "No viable") {
    const fallas: [boolean, string][] = [
      [criterios.cumpleEndeudamiento, "No cumple endeudamiento."],
      [criterios.cumpleSolvencia, "No cumple solvencia."],
      [criterios.cumpleDisponible, "No cumple disponible."],
      [criterios.cumpleDesprotegido, "No cumple desprotegido."],
    ]
    for (const [cumple, motivo] of fallas) {
      if (!cumple) motivos.push(motivo)
    }
  }

  return {
    radicado: filas.radicado,
    nombre,
    gestion: filas.gestionado_at
      ? {
          por: filas.gestionado_by ?? "—",
          fecha: FORMATO_FECHA.format(filas.gestionado_at),
          nota: filas.gestionado_nota ?? null,
        }
      : null,
    cedula: comoTexto(filas.cedula),
    monto: moneda(detallado.montoSolicitado),
    fecha: fechaDeRadicado(filas.radicado),
    estado,
    campos,
    criterios,
    motivos,
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
