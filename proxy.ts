import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

import { esRutaProtegida } from "@/lib/auth/roles"

/**
 * Solo hace el redirect rapido cuando NO hay cookie de sesion: no consulta la
 * base ni valida el rol (el middleware corre en el edge). El permiso de verdad
 * se verifica en los layouts con exigirSesion().
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const cookieSesion = getSessionCookie(request)

  // Ojo: NO se redirige desde /login cuando hay cookie. getSessionCookie solo
  // comprueba que la cookie exista, no que la sesion siga viva; con una cookie
  // vencida eso hacia un bucle /login -> / -> /login. De sacar al usuario ya
  // autenticado se encarga la propia pagina de login, que si valida la sesion.

  if (esRutaProtegida(pathname) && !cookieSesion) {
    const destino = new URL("/login", request.url)
    destino.searchParams.set("session", "expired")
    destino.searchParams.set("from", `${pathname}${search}`)
    return NextResponse.redirect(destino)
  }

  return NextResponse.next()
}

export const config = {
  // Todo menos assets estaticos y las rutas de Better Auth.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\.svg|.*\.png).*)"],
}
