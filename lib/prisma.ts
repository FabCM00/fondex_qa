import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/lib/generated/prisma/client"

const crearCliente = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  })

const globalParaPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof crearCliente> | undefined
}

export const prisma = globalParaPrisma.prisma ?? crearCliente()

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma
}