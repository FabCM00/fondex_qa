"use client"

import * as React from "react"

/** Marco visual de las pantallas de autenticación centrado vertical y horizontalmente. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-6 sm:p-10">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        {/* Encabezado con Logo */}
        <div className="flex items-center gap-2.5">
                    <span className="text-lg font-bold tracking-tight text-foreground">
          </span>
        </div>

        {/* Formulario / Contenido Principal */}
        <div className="w-full">{children}</div>

        {/* Pie de página */}
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} WANT N&apos; GET · Motor de crédito
        </p>
      </div>
    </div>
  )
}