import "dotenv/config"

import { betterAuth } from "better-auth"

import { opcionesAuth } from "@/lib/auth/auth"
import { prisma } from "@/lib/prisma"
import type { Rol } from "@/lib/auth/roles"

// Usuarios iniciales. La contrasena la hashea Better Auth (no la guardamos
// nosotros), por eso creamos via signUpEmail y luego ajustamos el rol.
// Misma configuracion de la app pero con registro habilitado: el alta de
// usuarios en produccion la hace un ADMIN, aqui necesitamos crear el primero.
const authSeed = betterAuth({
  ...opcionesAuth,
  emailAndPassword: { ...opcionesAuth.emailAndPassword, disableSignUp: false },
  databaseHooks: {
    ...opcionesAuth.databaseHooks,
    // El hook de la app rechaza toda creacion de usuarios (cierra la puerta que
    // abre el login social). Aqui crear usuarios es justamente el objetivo, y
    // los datos vienen del entorno, no de nadie por internet.
    user: undefined,
  },
})

const SEMILLA: { nombre: string; email: string; password: string; rol: Rol }[] =
  [
    {
      nombre: "Héctor Cardoso",
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@wantnget.com.co",
      password: process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!",
      rol: "ADMIN",
    },
    {
      nombre: "Diana Martínez",
      email: "colaborador@wantnget.com.co",
      password: "Colab1234!",
      rol: "COLABORADOR",
    },
  ]

async function main() {
  for (const cuenta of SEMILLA) {
    const existente = await prisma.user.findUnique({
      where: { email: cuenta.email },
      include: { accounts: true },
    })

    if (existente) {
      const tieneCredencial = existente.accounts.some(
        (c) => c.providerId === "credential" && c.password
      )

      if (tieneCredencial) {
        console.log(`= ya existe: ${cuenta.email} (${existente.role})`)
        continue
      }

      // Quedo a medias (usuario sin contrasena): lo recreamos.
      await prisma.user.delete({ where: { id: existente.id } })
      console.log(`~ recreando incompleto: ${cuenta.email}`)
    }

    // signUpEmail crea User + Account con el hash de la contrasena.
    await authSeed.api.signUpEmail({
      body: {
        name: cuenta.nombre,
        email: cuenta.email,
        password: cuenta.password,
      },
    })

    await prisma.user.update({
      where: { email: cuenta.email },
      data: { role: cuenta.rol, emailVerified: true, active: true },
    })

    console.log(`+ creado: ${cuenta.email} (${cuenta.rol})`)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
