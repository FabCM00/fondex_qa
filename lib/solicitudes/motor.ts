import "server-only"

import http from "node:http"
import https from "node:https"

/**
 * Cliente del motor de credito.
 *
 * La base sale de API_MOTOR_API_URL y el paso se concatena: por ahora solo
 * `motor-process`, que recalcula la decision a partir de un payload que ya
 * existe. `motor-data` no se expone porque volveria a llamar a los servicios
 * externos (Coopvalili, TransUnion) y traeria datos nuevos, no un recalculo.
 */
const PASOS_MOTOR = ["motor-process"] as const

export type PasoMotor = (typeof PASOS_MOTOR)[number]

export type RespuestaMotor =
  | { ok: true; datos: unknown }
  | { ok: false; mensaje: string }

/** Si el motor no responde, no se deja la peticion colgada. */
const MS_TIMEOUT = 60_000

/**
 * Se usa `node:https` en vez de fetch porque el motor se sirve por HTTPS sobre
 * una IP: su certificado no coincide con ningun nombre y hay que aceptarlo
 * explicitamente (`rejectUnauthorized: false`). Con fetch eso obligaria a
 * tocar NODE_TLS_REJECT_UNAUTHORIZED, que desactivaria la validacion para toda
 * la app, incluidas las conexiones a Azure y ZapSign.
 */
function pedir(
  url: URL,
  cuerpo: string,
  apiKey: string
): Promise<{ status: number; texto: string }> {
  const esHttps = url.protocol === "https:"
  const cliente = esHttps ? https : http

  return new Promise((resolver, rechazar) => {
    const peticion = cliente.request(
      {
        hostname: url.hostname,
        port: url.port || (esHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(cuerpo),
          "x-api-key": apiKey,
        },
        timeout: MS_TIMEOUT,
        // Solo aplica a https: el certificado es para una IP.
        ...(esHttps ? { rejectUnauthorized: false } : {}),
      },
      (respuesta) => {
        let texto = ""
        respuesta.setEncoding("utf8")
        respuesta.on("data", (trozo) => {
          texto += trozo
        })
        respuesta.on("end", () =>
          resolver({ status: respuesta.statusCode ?? 0, texto })
        )
      }
    )

    peticion.on("timeout", () => {
      peticion.destroy(
        new Error(`El motor no respondió en ${MS_TIMEOUT / 1000}s.`)
      )
    })
    peticion.on("error", rechazar)

    peticion.write(cuerpo)
    peticion.end()
  })
}

export async function ejecutarMotor(
  paso: PasoMotor,
  payload: unknown
): Promise<RespuestaMotor> {
  const base = process.env.API_MOTOR_API_URL
  const apiKey = process.env.API_KEY_MOTOR

  if (!base) {
    return { ok: false, mensaje: "Falta API_MOTOR_API_URL en el entorno." }
  }

  if (!apiKey) {
    return { ok: false, mensaje: "Falta API_KEY_MOTOR en el entorno." }
  }

  let url: URL
  try {
    // La base puede venir con o sin barra final.
    url = new URL(`${base.replace(/\/+$/, "")}/${paso}`)
  } catch {
    return { ok: false, mensaje: `API_MOTOR_API_URL no es una URL válida.` }
  }

  try {
    const { status, texto } = await pedir(url, JSON.stringify(payload), apiKey)

    if (status < 200 || status >= 300) {
      return {
        ok: false,
        mensaje: `El motor respondió ${status}: ${texto.slice(0, 300)}`,
      }
    }

    try {
      return { ok: true, datos: JSON.parse(texto) }
    } catch {
      return {
        ok: false,
        mensaje: `El motor no devolvió JSON: ${texto.slice(0, 300)}`,
      }
    }
  } catch (error) {
    return {
      ok: false,
      mensaje: `No se pudo llamar al motor: ${(error as Error).message}`,
    }
  }
}
