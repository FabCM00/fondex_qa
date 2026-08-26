import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /**
   * Toda la app se sirve bajo este prefijo. Next reescribe las rutas, los
   * <Link> y los assets solo, asi que el codigo sigue usando rutas sin prefijo
   * ("/dashboard", "/login"): no hay que tocar navegacion.ts ni los redirects.
   *
   * Lo que SI lleva el prefijo, porque son URLs absolutas y salen de la app:
   *   - NEXT_PUBLIC_APP_URL en .env (Better Auth arma los enlaces de correo)
   *   - la URL del webhook registrada en ZapSign
   */

  experimental: {
    serverActions: {
      // Los documentos se suben por Server Action y el limite por defecto es
      // 1MB. Se sube a 25MB: el tope por archivo son 20MB (ver
      // lib/documentos/schema.ts) mas el margen del propio FormData.
      bodySizeLimit: "25mb",
    },
  },
}

export default nextConfig
