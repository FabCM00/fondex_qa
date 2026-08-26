import * as React from "react"

export const TITULO_CLASS =
  "text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase"

/** Titulo de seccion (con separacion inferior). */
export function Titulo({ children }: { children: React.ReactNode }) {
  return <h2 className={`pb-2 ${TITULO_CLASS}`}>{children}</h2>
}

/** Mismo estilo, en linea, para encabezados de dato. */
export function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span className={TITULO_CLASS}>{children}</span>
}
