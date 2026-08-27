"use server"

import { exigirRol, exigirUsuario } from "@/lib/auth/sesion"
import { prisma } from "@/lib/prisma"
import { ejecutarMotor } from "@/lib/solicitudes/motor"
import { escribirRuta, partirRuta } from "@/lib/motores/rutas"
import {
  actualizarCampo,
  construirFormulario,
  crearCampo,
  eliminarCampo,
  listarCampos,
  obtenerRequestVigente,
} from "@/lib/motores/repo"
import {
  esMotorId,
  esTipoCampo,
  MOTOR_POR_DEFECTO,
  normalizarValor,
  type CampoFormulario,
  type EntradaCampo,
  type Resultado,
} from "@/lib/motores/schema"

export async function cargarCamposEdicion(motor: string) {
  await exigirRol("ADMIN")
  return listarCampos(motor)
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

  return { ok: true, mensaje: "Motor ejecutado. Se actualizó la solicitud." }
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
