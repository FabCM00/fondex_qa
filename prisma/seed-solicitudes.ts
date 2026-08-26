import "dotenv/config"

import fs from "node:fs"
import path from "node:path"

import { prisma } from "@/lib/prisma"

const RAIZ = path.join(process.cwd(), "prisma", "seed-data")

/** Un paso del flujo: su tabla y los archivos que lo alimentan. */
const PASOS = [
  { tabla: "valida1_results", archivo: "validate" },
  { tabla: "motor_data_results", archivo: "motor-data" },
  { tabla: "motor_process_results", archivo: "motor-process" },
  { tabla: "identity_validations", archivo: "identidad" },
] as const

type Paso = (typeof PASOS)[number]

function leerJson(carpeta: string, nombre: string): unknown | null {
  const ruta = path.join(carpeta, `${nombre}.json`)
  if (!fs.existsSync(ruta)) return null

  try {
    return JSON.parse(fs.readFileSync(ruta, "utf8"))
  } catch (error) {
    throw new Error(`${nombre}.json no es JSON valido: ${(error as Error).message}`)
  }
}

/** Toma radicado y cedula del validate-res (o del primer archivo que los traiga). */
function identificar(carpeta: string) {
  for (const paso of PASOS) {
    for (const direccion of ["res", "req"] as const) {
      const json = leerJson(carpeta, `${paso.archivo}-${direccion}`) as
        | Record<string, unknown>
        | null
      if (!json) continue

      const radicado = json.radicado as string | undefined
      const cedula = (json.id ?? json.Id) as string | number | undefined

      if (radicado) {
        return {
          radicado,
          // Si no viene el id suelto, se saca del propio radicado.
          cedula: String(cedula ?? radicado.split("_")[0]),
        }
      }
    }
  }
  return null
}

async function sembrarCarpeta(carpeta: string) {
  const solicitud = identificar(carpeta)

  if (!solicitud) {
    console.log(`- ${path.basename(carpeta)}: sin radicado, se omite`)
    return
  }

  const { radicado, cedula } = solicitud
  const base = { radicado, cedula }

  // valida1_results es la tabla padre: las demas la referencian.
  const validate = PASOS[0]
  await prisma.valida1_results.upsert({
    where: { radicado },
    create: {
      ...base,
      request_json: leerJson(carpeta, `${validate.archivo}-req`) ?? undefined,
      response_json: leerJson(carpeta, `${validate.archivo}-res`) ?? undefined,
    },
    update: {
      request_json: leerJson(carpeta, `${validate.archivo}-req`) ?? undefined,
      response_json: leerJson(carpeta, `${validate.archivo}-res`) ?? undefined,
    },
  })

  // Cada delegate de Prisma tiene su propio tipo, por eso van uno a uno.
  const datos = (paso: Paso) => {
    const request = leerJson(carpeta, `${paso.archivo}-req`)
    const response = leerJson(carpeta, `${paso.archivo}-res`)

    if (!request && !response) {
      console.log(`  · ${paso.tabla}: sin archivos, se omite`)
      return null
    }

    return {
      request_json: request ?? undefined,
      response_json: response ?? undefined,
    }
  }

  const motorData = datos(PASOS[1])
  if (motorData) {
    // motor_data_results es 1:N (una solicitud puede reprocesarse), asi que no
    // hay llave unica por radicado: se reemplaza lo que hubiera.
    await prisma.motor_data_results.deleteMany({ where: { radicado } })
    await prisma.motor_data_results.create({
      data: { ...base, ...motorData },
    })
  }

  const motorProcess = datos(PASOS[2])
  if (motorProcess) {
    await prisma.motor_process_results.upsert({
      where: { radicado },
      create: { ...base, ...motorProcess },
      update: motorProcess,
    })
  }

  const identidad = datos(PASOS[3])
  if (identidad) {
    await prisma.identity_validations.upsert({
      where: { radicado },
      create: { ...base, ...identidad },
      update: identidad,
    })
  }

  console.log(`+ ${radicado} (C.C. ${cedula})`)
}

async function main() {
  if (!fs.existsSync(RAIZ)) {
    throw new Error(`No existe ${RAIZ}. Ver prisma/seed-data/LEEME.md`)
  }

  // Subcarpetas = una solicitud cada una. Si no hay, la raiz es la solicitud.
  const subcarpetas = fs
    .readdirSync(RAIZ, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => path.join(RAIZ, entrada.name))

  const carpetas = subcarpetas.length > 0 ? subcarpetas : [RAIZ]

  for (const carpeta of carpetas) {
    await sembrarCarpeta(carpeta)
  }

  const total = await prisma.valida1_results.count()
  console.log(`\nSolicitudes en la base: ${total}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
