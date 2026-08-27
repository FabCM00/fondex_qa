"use server"

import { exigirSesion } from "@/lib/auth/sesion"
import { prisma } from "@/lib/prisma"
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
