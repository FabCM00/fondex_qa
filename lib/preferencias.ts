"use client"

import * as React from "react"

/** Como se navega entre modulos: menu lateral o barra superior. */
export type ModoNavegacion = "sidebar" | "navbar"

export const LLAVE_NAVEGACION = "wng:navegacion"

export const MODOS: {
  id: ModoNavegacion
  label: string
  descripcion: string
}[] = [
  {
    id: "sidebar",
    label: "Menú lateral",
    descripcion: "Los módulos viven en la columna izquierda.",
  },
  {
    id: "navbar",
    label: "Barra superior",
    descripcion: "Los módulos pasan arriba y liberan ancho.",
  },
]

const esModo = (valor: unknown): valor is ModoNavegacion =>
  valor === "sidebar" || valor === "navbar"

/** Lee la preferencia guardada. En el servidor siempre devuelve "sidebar". */
function leerGuardado(): ModoNavegacion {
  try {
    const guardado = localStorage.getItem(LLAVE_NAVEGACION)
    return esModo(guardado) ? guardado : "sidebar"
  } catch {
    // Modo incognito o storage bloqueado: se usa el valor por defecto.
    return "sidebar"
  }
}

// Suscripcion compartida: al cambiar el modo en Preferencias, el shell
// se entera sin recargar la pagina.
const oyentes = new Set<() => void>()

function avisar() {
  oyentes.forEach((oyente) => oyente())
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  // Tambien reacciona si se cambia desde otra pestaña.
  window.addEventListener("storage", oyente)
  return () => {
    oyentes.delete(oyente)
    window.removeEventListener("storage", oyente)
  }
}

export function guardarModoNavegacion(modo: ModoNavegacion) {
  try {
    localStorage.setItem(LLAVE_NAVEGACION, modo)
  } catch {
    // Si no se puede persistir, igual se aplica en esta sesion.
  }
  avisar()
}

/**
 * Modo de navegacion actual. useSyncExternalStore evita el desajuste de
 * hidratacion: el servidor siempre entrega "sidebar".
 */
export function useModoNavegacion(): ModoNavegacion {
  return React.useSyncExternalStore(suscribir, leerGuardado, () => "sidebar")
}
