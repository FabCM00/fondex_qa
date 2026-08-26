import { NextResponse } from "next/server"

import {
  procesarWebhook,
  WEBHOOK_SECRET,
  type PayloadWebhook,
} from "@/lib/documentos/zapsign"

/**
 * Webhook de ZapSign: avisa cuando un sobre se firma, se rechaza o falla.
 *
 * No lleva sesion (lo llama ZapSign, no un navegador), asi que se protege con
 * un secreto compartido en la query: la URL que se registra en su panel debe
 * ser .../api/webhooks/zapsign?secret=<ZAPSIGN_WEBHOOK_SECRET>.
 *
 * Siempre responde 200 salvo que el secreto no cuadre: ZapSign reintenta ante
 * cualquier otro codigo, y un payload que no reconocemos no mejora al repetirse.
 */
export async function POST(peticion: Request) {
  const url = new URL(peticion.url)

  if (!WEBHOOK_SECRET || url.searchParams.get("secret") !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let payload: PayloadWebhook

  try {
    payload = (await peticion.json()) as PayloadWebhook
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  try {
    const resultado = await procesarWebhook(payload)
    return NextResponse.json(resultado)
  } catch (error) {
    // Se registra y se responde 200: reintentar no va a arreglar un PDF que no
    // se pudo bajar, y el payload ya quedo guardado para revisarlo a mano.
    console.error("[zapsign] fallo procesando el webhook:", error)
    return NextResponse.json({ ok: false, mensaje: "Error al procesar." })
  }
}
