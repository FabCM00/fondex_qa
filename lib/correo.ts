import "server-only"

import { EmailClient } from "@azure/communication-email"

type Correo = {
  para: string
  asunto: string
  html: string
}

const conexion = process.env.AZURE_EMAIL_CONNECTION_STRING
const remitente = process.env.EMAIL_FROM

let cliente: EmailClient | null = null

function obtenerCliente() {
  if (!conexion) return null
  cliente ??= new EmailClient(conexion)
  return cliente
}

/**
 * Envia un correo con Azure Communication Services. Si falta configuracion
 * (dev local) lo escribe en consola en lugar de fallar.
 */
export async function enviarCorreo({ para, asunto, html }: Correo) {
  const emailClient = obtenerCliente()

  if (!emailClient || !remitente) {
    console.info(`[correo simulado] para=${para} asunto="${asunto}"`)
    return { ok: true, simulado: true }
  }

  const operacion = await emailClient.beginSend({
    senderAddress: remitente,
    content: { subject: asunto, html },
    recipients: { to: [{ address: para }] },
  })

  await operacion.pollUntilDone()
  return { ok: true, simulado: false }
}

export function plantillaReset({ enlace }: { enlace: string }) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="font-size: 20px; margin-bottom: 8px;">Restablece tu contraseña</h1>
      <p style="color: #555; line-height: 1.6;">
        Recibimos una solicitud para cambiar la contraseña de tu cuenta en el
        motor de crédito. Haz clic en el botón para elegir una nueva.
      </p>
      <p style="margin: 24px 0;">
        <a href="${enlace}"
           style="background: #ffbf53; color: #2f2e41; padding: 12px 20px;
                  border-radius: 10px; text-decoration: none; font-weight: 600;">
          Cambiar mi contraseña
        </a>
      </p>
      <p style="color: #888; font-size: 12px;">
        El enlace vence en 1 hora y solo sirve una vez. Si no pediste este
        cambio, ignora este correo: tu contraseña sigue igual.
      </p>
    </div>
  `
}

export function plantillaInvitacion({
  enlace,
  rol,
}: {
  enlace: string
  rol: string
}) {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="font-size: 20px; margin-bottom: 8px;">Te invitaron a WANT N' GET</h1>
      <p style="color: #555; line-height: 1.6;">
        Tienes acceso al motor de crédito con el rol <strong>${rol}</strong>.
        Haz clic en el botón para crear tu contraseña y entrar.
      </p>
      <p style="margin: 24px 0;">
        <a href="${enlace}"
           style="background: #ffbf53; color: #2f2e41; padding: 12px 20px;
                  border-radius: 10px; text-decoration: none; font-weight: 600;">
          Crear mi contraseña
        </a>
      </p>
      <p style="color: #888; font-size: 12px;">
        El enlace vence en 48 horas. Si no esperabas esta invitación, ignora este correo.
      </p>
    </div>
  `
}
