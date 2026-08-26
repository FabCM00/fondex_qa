"use server"

import { exigirSesion } from "@/lib/auth/sesion"
import { prisma } from "@/lib/prisma"
import { ejecutarMotor } from "@/lib/solicitudes/motor"
import {
  contarPorEstado,
  listarSolicitudes,
  obtenerSolicitud,
  type FiltroBandeja,
} from "@/lib/solicitudes/repo"

/** Cada salto de pagina, filtro o busqueda consulta solo esas 10 filas. */
export async function cargarPagina(filtro: FiltroBandeja) {
  await exigirSesion("/dashboard")
  return listarSolicitudes(filtro)
}

/** Contadores del panel de filtros. */
export async function cargarConteos(categoria: FiltroBandeja["categoria"]) {
  await exigirSesion("/dashboard")
  return contarPorEstado(categoria)
}

/** Los JSON pesados se traen solo al abrir una solicitud. */
export async function cargarDetalle(radicado: string) {
  await exigirSesion("/dashboard")
  return obtenerSolicitud(radicado)
}

/**
 * Marca la solicitud como gestionada: queda registrado quien la reviso,
 * cuando y su observacion. Con eso sale de Activas y entra a Gestionadas.
 */
export async function marcarGestionada(radicado: string, nota?: string) {
  const usuario = await exigirSesion("/dashboard")

  const existente = await prisma.valida1_results.findUnique({
    where: { radicado },
    select: { gestionado_at: true },
  })

  if (!existente) {
    return { ok: false, mensaje: "La solicitud no existe." }
  }

  if (existente.gestionado_at) {
    return { ok: false, mensaje: "Esta solicitud ya fue gestionada." }
  }

  await prisma.valida1_results.update({
    where: { radicado },
    data: {
      gestionado_at: new Date(),
      gestionado_by: usuario.email,
      gestionado_nota: nota?.trim() || null,
    },
  })

  return { ok: true, mensaje: `Solicitud ${radicado} marcada como gestionada.` }
}

/**
 * Reejecuta motor-process con un payload editado a mano.
 *
 * Antes de sobrescribir la fila vigente se archiva lo que habia en
 * motor_ejecuciones, asi que la version anterior nunca se pierde y la mas
 * antigua del historial es siempre la del motor automatico.
 *
 * El estado de la solicitud no se toca: lo derivan las reglas de estados.ts a
 * partir de la respuesta nueva.
 */
export async function reejecutarMotorProcess(
  radicado: string,
  requestEditado: unknown
) {
  const usuario = await exigirSesion("/dashboard")

  const vigente = await prisma.motor_process_results.findUnique({
    where: { radicado },
    select: { cedula: true, request_json: true, response_json: true },
  })

  if (!vigente) {
    return {
      ok: false as const,
      mensaje: "Esta solicitud no tiene una ejecución previa del motor.",
    }
  }

  const resultado = await ejecutarMotor("motor-process", requestEditado)

  if (!resultado.ok) {
    return { ok: false as const, mensaje: resultado.mensaje }
  }

  // Se archiva y se sobrescribe en la misma transaccion: si algo falla no
  // queda una version guardada sin su reemplazo, ni al contrario.
  await prisma.$transaction([
    prisma.motor_ejecuciones.create({
      data: {
        radicado,
        request_json: vigente.request_json ?? undefined,
        response_json: vigente.response_json ?? undefined,
        // El historial guarda quien ejecuto lo que se esta archivando; para la
        // primera version es null porque la corrio el motor automatico.
        ejecutado_por: null,
      },
    }),
    prisma.motor_process_results.update({
      where: { radicado },
      data: {
        request_json: requestEditado as never,
        response_json: resultado.datos as never,
      },
    }),
    prisma.motor_ejecuciones.create({
      data: {
        radicado,
        request_json: requestEditado as never,
        response_json: resultado.datos as never,
        ejecutado_por: usuario.email,
      },
    }),
    // Se borra el override manual: apuntaba a un resultado que ya no existe.
    // Dejarlo taparia la decision nueva del motor, que es justo lo que se
    // acaba de pedir. La solicitud vuelve al estado que digan las reglas.
    prisma.valida1_results.update({
      where: { radicado },
      data: {
        estado_manual: null,
        estado_manual_at: null,
        estado_manual_by: null,
      },
    }),
  ])

  return {
    ok: true as const,
    mensaje: "Motor ejecutado. Se actualizó la solicitud.",
  }
}

/** El historial de ejecuciones de una solicitud, de la mas reciente a la mas vieja. */
export async function cargarHistorialMotor(radicado: string) {
  await exigirSesion("/dashboard")

  const filas = await prisma.motor_ejecuciones.findMany({
    where: { radicado },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      request_json: true,
      response_json: true,
      ejecutado_por: true,
      created_at: true,
    },
  })

  // BigInt no viaja por el limite servidor/cliente de los Server Actions.
  return filas.map((fila) => ({ ...fila, id: String(fila.id) }))
}
