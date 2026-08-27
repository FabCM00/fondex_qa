"use server"

import { exigirUsuario } from "@/lib/auth/sesion"
import { prisma } from "@/lib/prisma"

/** Los proveedores que la app reconoce, con su nombre para la UI. */
const NOMBRES: Record<string, string> = {
  credential: "Correo y contraseña",
  microsoft: "Microsoft (cuenta corporativa)",
}

export type MetodoAcceso = {
  id: string
  nombre: string
  /** Formateada, lista para pintar. */
  desde: string
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
})

/**
 * Con que puede iniciar sesion el usuario actual.
 *
 * Cada fila de `account` es un metodo: `credential` es la contrasena y
 * `microsoft` el acceso por Entra ID. Tener las dos significa que sirve
 * cualquiera de las dos.
 *
 * No dice con cual esta autenticada la sesion de ahora: Better Auth no lo
 * guarda, y para saberlo habria que anotarlo en `session` al iniciar.
 */
export async function cargarMetodosAcceso(): Promise<MetodoAcceso[]> {
  const usuario = await exigirUsuario()

  const cuentas = await prisma.account.findMany({
    where: { userId: usuario.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, providerId: true, createdAt: true },
  })

  return cuentas.map((cuenta) => ({
    id: cuenta.id,
    nombre: NOMBRES[cuenta.providerId] ?? cuenta.providerId,
    desde: FORMATO_FECHA.format(cuenta.createdAt),
  }))
}
