/**
 * Los avisos que puede mostrar el login, con su mensaje.
 *
 * Viven aparte del formulario porque llegan de tres sitios distintos —
 * `?session=` lo pone el cierre de sesion y el middleware, `?social=` y
 * `?error=` los pone Better Auth al rechazar un login social— y tenerlos en una
 * sola tabla evita que el formulario se llene de condiciones anidadas.
 */

export type TonoAviso = "info" | "error"

export type Aviso = {
  mensaje: string
  tono: TonoAviso
}

/** Lo que pone la app: cierre de sesion y expiracion. */
const POR_SESION: Record<string, Aviso> = {
  expired: {
    mensaje: "Tu sesión expiró. Por favor inicia sesión nuevamente.",
    tono: "info",
  },
  closed: {
    mensaje: "Tu sesión se cerró correctamente.",
    tono: "info",
  },
}

/**
 * Lo que pone Better Auth cuando rechaza un login social. El código viene en
 * `?error=`; los que no reconocemos caen al mensaje genérico.
 */
const POR_ERROR_SOCIAL: Record<string, Aviso> = {
  account_not_linked: {
    mensaje:
      "Esa cuenta de Microsoft no está vinculada. Inicia sesión con tu contraseña primero.",
    tono: "error",
  },
  FORBIDDEN: {
    mensaje: "Tu cuenta no tiene acceso. Contacta a un administrador.",
    tono: "error",
  },
}

const GENERICO_SOCIAL: Aviso = {
  mensaje:
    "No pudimos entrar con Microsoft. Si el problema sigue, contacta a un administrador.",
  tono: "error",
}

/**
 * El aviso que corresponde a los parametros de la URL, o null si no hay ninguno.
 * El fallo social gana sobre el de sesion: si ambos vienen, el usuario acaba de
 * intentar entrar y eso es lo que le importa.
 */
export function avisoDeParametros(params: URLSearchParams): Aviso | null {
  if (params.get("social") === "error") {
    const codigo = params.get("error")
    return (codigo && POR_ERROR_SOCIAL[codigo]) || GENERICO_SOCIAL
  }

  const sesion = params.get("session")
  return (sesion && POR_SESION[sesion]) || null
}
