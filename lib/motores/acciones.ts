"use server"

import { exigirRol, exigirUsuario } from "@/lib/auth/sesion"
import { prisma } from "@/lib/prisma"
import { ejecutarMotor } from "@/lib/solicitudes/motor"
import { escribirRuta, partirRuta } from "@/lib/motores/rutas"
import {
  actualizarCampo,
  construirFormulario,
  consumirIntento,
  crearCampo,
  eliminarCampo,
  guardarAjuste,
  listarAjustes,
  listarCampos,
  obtenerIntentosUsados,
  obtenerRequestVigente,
} from "@/lib/motores/repo"
import {
  AJUSTE_ENVIO_SCORE,
  AJUSTE_REEJECUCION,
  esMotorId,
  esTipoCampo,
  MOTOR_POR_DEFECTO,
  normalizarValor,
  type AjusteMotor,
  type CampoFormulario,
  type EntradaCampo,
  type EstadoIntento,
  type Resultado,
} from "@/lib/motores/schema"

export async function cargarCamposEdicion(motor: string) {
  await exigirRol("ADMIN")
  return listarCampos(motor)
}

export async function cargarAjustesMotor(
  motor: string = MOTOR_POR_DEFECTO
): Promise<AjusteMotor[]> {
  await exigirRol("ADMIN")
  return listarAjustes(motor)
}

/**
 * Cupo por radicado, para cualquier usuario: por cada clave de motorAjuste,
 * el limite vigente, cuanto ya se uso en ESTE radicado y si todavia puede.
 * El limite nunca se copia a la solicitud: siempre se lee en vivo desde
 * motorAjuste, asi que cambiarlo en Ajustes afecta al instante a toda
 * solicitud, nueva o vieja.
 */
export async function cargarEstadoIntentos(
  radicado: string,
  motor: string = MOTOR_POR_DEFECTO
): Promise<Record<string, EstadoIntento>> {
  await exigirUsuario()

  const [ajustes, usados] = await Promise.all([
    listarAjustes(motor),
    obtenerIntentosUsados(radicado),
  ])

  return Object.fromEntries(
    ajustes.map((ajuste) => {
      const usadosClave = usados[ajuste.clave] ?? 0
      const limite = ajuste.valorNumero
      const puede = limite === null ? true : usadosClave < limite
      return [ajuste.clave, { limite, usados: usadosClave, puede }]
    })
  )
}

async function validarCupo(
  radicado: string,
  motor: string,
  clave: string
): Promise<Resultado & { puede: boolean }> {
  const estado = await cargarEstadoIntentos(radicado, motor)
  const ajuste = estado[clave]

  if (ajuste && !ajuste.puede) {
    return {
      ok: false,
      puede: false,
      mensaje: `Se agotaron los intentos permitidos (${ajuste.limite}) para esta solicitud.`,
    }
  }

  return { ok: true, puede: true, mensaje: "" }
}

export async function guardarAjusteMotor(
  motor: string,
  clave: string,
  valorNumero: number
): Promise<Resultado> {
  await exigirRol("ADMIN")

  try {
    await guardarAjuste(motor, clave, valorNumero)
    return { ok: true, mensaje: "Ajuste actualizado." }
  } catch {
    return { ok: false, mensaje: "No se pudo guardar el ajuste." }
  }
}

export async function cargarFormularioEdicion(
  radicado: string,
  motor: string = MOTOR_POR_DEFECTO
): Promise<
  | { ok: true; campos: CampoFormulario[] }
  | { ok: false; mensaje: string }
> {
  await exigirUsuario()

  if (!esMotorId(motor)) {
    return { ok: false, mensaje: "Ese motor no existe." }
  }

  const request = await obtenerRequestVigente(radicado)

  if (request === null) {
    return {
      ok: false,
      mensaje: "Esta solicitud no tiene una ejecución previa del motor.",
    }
  }

  const campos = await construirFormulario(motor, request)

  if (!campos.length) {
    return {
      ok: false,
      mensaje:
        "No hay campos configurados para editar. Un administrador debe definirlos en Parámetros.",
    }
  }

  return { ok: true, campos }
}

export async function ejecutarConCambios(
  radicado: string,
  cambios: Record<string, unknown>,
  motor: string = MOTOR_POR_DEFECTO
): Promise<Resultado> {
  const usuario = await exigirUsuario()

  if (!esMotorId(motor)) {
    return { ok: false, mensaje: "Ese motor no existe." }
  }

  const cupo = await validarCupo(radicado, motor, AJUSTE_REEJECUCION)
  if (!cupo.puede) return cupo

  const vigente = await prisma.motor_process_results.findUnique({
    where: { radicado },
    select: { request_json: true, response_json: true },
  })

  if (!vigente?.request_json) {
    return {
      ok: false,
      mensaje: "Esta solicitud no tiene una ejecución previa del motor.",
    }
  }

  const campos = await listarCampos(motor)
  const editables = campos.filter((campo) => campo.editable)

  if (!editables.length) {
    return {
      ok: false,
      mensaje: "No hay campos habilitados para editar en este motor.",
    }
  }

  let request: unknown = vigente.request_json

  for (const campo of editables) {
    if (!(campo.campo in cambios)) continue

    const valor = normalizarValor(cambios[campo.campo], campo.tipo)

    if (valor === undefined) {
      return {
        ok: false,
        mensaje: `El valor de "${campo.etiqueta}" no es válido.`,
      }
    }

    request = escribirRuta(request, campo.campo, valor)
  }

  const resultado = await ejecutarMotor(motor, request)

  if (!resultado.ok) {
    return { ok: false, mensaje: resultado.mensaje }
  }

  await prisma.$transaction([
    prisma.motor_ejecuciones.create({
      data: {
        radicado,
        request_json: vigente.request_json ?? undefined,
        response_json: vigente.response_json ?? undefined,
        ejecutado_por: null,
      },
    }),
    prisma.motor_process_results.update({
      where: { radicado },
      data: {
        request_json: request as never,
        response_json: resultado.datos as never,
      },
    }),
    prisma.motor_ejecuciones.create({
      data: {
        radicado,
        request_json: request as never,
        response_json: resultado.datos as never,
        ejecutado_por: usuario.email,
      },
    }),
    prisma.valida1_results.update({
      where: { radicado },
      data: {
        estado_manual: null,
        estado_manual_at: null,
        estado_manual_by: null,
      },
    }),
  ])

  await consumirIntento(radicado, AJUSTE_REEJECUCION)

  return { ok: true, mensaje: "Motor ejecutado. Se actualizó la solicitud." }
}

/**
 * Arma el mismo payload que se le manda a Core, a partir de la oferta que ya
 * calculo motor-process. Se usa para mostrarlo en el dialogo de confirmacion
 * antes de enviar: nunca se acepta el JSON que mande el cliente, siempre se
 * reconstruye aqui desde lo que realmente hay guardado.
 */
export async function previsualizarEnvioCore(
  radicado: string
): Promise<{ ok: true; payload: unknown } | { ok: false; mensaje: string }> {
  await exigirUsuario()

  const fila = await prisma.motor_process_results.findUnique({
    where: { radicado },
    select: { cedula: true, response_json: true },
  })

  const oferta = (fila?.response_json as { oferta?: unknown } | null)?.oferta

  if (!fila || !oferta) {
    return {
      ok: false,
      mensaje: "Esta solicitud no tiene una oferta calculada por el motor.",
    }
  }

  return {
    ok: true,
    payload: { id: fila.cedula, radicado, oferta },
  }
}

export async function enviarACore(
  radicado: string,
  motor: string = MOTOR_POR_DEFECTO
): Promise<Resultado> {
  await exigirUsuario()

  if (!esMotorId(motor)) {
    return { ok: false, mensaje: "Ese motor no existe." }
  }

  const cupo = await validarCupo(radicado, motor, AJUSTE_ENVIO_SCORE)
  if (!cupo.puede) return cupo

  const previa = await previsualizarEnvioCore(radicado)
  if (!previa.ok) return previa

  const resultado = await ejecutarMotor("workflow", previa.payload)

  if (!resultado.ok) {
    return { ok: false, mensaje: resultado.mensaje }
  }

  await prisma.workflow_results.upsert({
    where: { radicado },
    create: {
      radicado,
      cedula: (previa.payload as { id: string }).id,
      request_json: previa.payload as never,
      response_json: resultado.datos as never,
    },
    update: {
      request_json: previa.payload as never,
      response_json: resultado.datos as never,
    },
  })

  await consumirIntento(radicado, AJUSTE_ENVIO_SCORE)

  return { ok: true, mensaje: "Se envió el crédito a Core." }
}

function validarEntrada(
  entrada: EntradaCampo
): { ok: true; datos: EntradaCampo } | { ok: false; mensaje: string } {
  const campo = partirRuta(entrada.campo).join(".")

  if (!campo) {
    return { ok: false, mensaje: "La ruta del campo es obligatoria." }
  }

  const etiqueta = entrada.etiqueta.trim()

  if (!etiqueta) {
    return { ok: false, mensaje: "La etiqueta es obligatoria." }
  }

  if (!esTipoCampo(entrada.tipo)) {
    return { ok: false, mensaje: "Ese tipo de campo no existe." }
  }

  if (!esMotorId(entrada.motor)) {
    return { ok: false, mensaje: "Ese motor no existe." }
  }

  return {
    ok: true,
    datos: {
      motor: entrada.motor,
      campo,
      etiqueta,
      tipo: entrada.tipo,
      editable: entrada.editable,
      ayuda: entrada.ayuda?.trim() || null,
      orden: Number.isFinite(entrada.orden) ? entrada.orden : 0,
    },
  }
}

export async function guardarCampoEdicion(
  entrada: EntradaCampo,
  id?: string
): Promise<Resultado> {
  await exigirRol("ADMIN")

  const validado = validarEntrada(entrada)

  if (!validado.ok) {
    return { ok: false, mensaje: validado.mensaje }
  }

  const { motor, ...resto } = validado.datos

  try {
    if (id) {
      await actualizarCampo(id, resto)
      return { ok: true, mensaje: `Se actualizó "${resto.etiqueta}".` }
    }

    await crearCampo({ motor, ...resto })
    return { ok: true, mensaje: `Se agregó "${resto.etiqueta}".` }
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return {
        ok: false,
        mensaje: `El campo "${resto.campo}" ya está configurado en este motor.`,
      }
    }

    return { ok: false, mensaje: "No se pudo guardar el campo." }
  }
}

export async function borrarCampoEdicion(id: string): Promise<Resultado> {
  await exigirRol("ADMIN")

  try {
    await eliminarCampo(id)
    return { ok: true, mensaje: "Campo eliminado." }
  } catch {
    return { ok: false, mensaje: "No se pudo eliminar el campo." }
  }
}
