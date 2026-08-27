export type ValorPlano = string | number | boolean | null

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
}

export function partirRuta(ruta: string): string[] {
  return ruta
    .split(".")
    .map((parte) => parte.trim())
    .filter(Boolean)
}

export function leerRuta(origen: unknown, ruta: string): unknown {
  const partes = partirRuta(ruta)
  if (!partes.length) return undefined

  let actual: unknown = origen

  for (const parte of partes) {
    if (!esObjeto(actual)) return undefined
    actual = actual[parte]
  }

  return actual
}

export function escribirRuta(
  origen: unknown,
  ruta: string,
  valor: ValorPlano
): unknown {
  const partes = partirRuta(ruta)
  if (!partes.length) return origen

  const raiz: Record<string, unknown> = esObjeto(origen) ? { ...origen } : {}
  let nivel = raiz

  for (const parte of partes.slice(0, -1)) {
    const siguiente = nivel[parte]
    const copia: Record<string, unknown> = esObjeto(siguiente)
      ? { ...siguiente }
      : {}
    nivel[parte] = copia
    nivel = copia
  }

  nivel[partes[partes.length - 1]] = valor

  return raiz
}

export function existeRuta(origen: unknown, ruta: string): boolean {
  const partes = partirRuta(ruta)
  if (!partes.length) return false

  let actual: unknown = origen

  for (const parte of partes.slice(0, -1)) {
    if (!esObjeto(actual)) return false
    actual = actual[parte]
  }

  return esObjeto(actual) && partes[partes.length - 1] in actual
}

export function rutasDe(origen: unknown, prefijo = ""): string[] {
  if (!esObjeto(origen)) return []

  return Object.entries(origen).flatMap(([clave, valor]) => {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave
    return esObjeto(valor) ? rutasDe(valor, ruta) : [ruta]
  })
}
