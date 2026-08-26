"use client"

import * as React from "react"

import { cargarConteos, cargarPagina } from "@/lib/solicitudes/acciones"
import type {
  PaginaSolicitudes,
  SolicitudEstado,
} from "@/lib/solicitudes/schema"

export type Conteos = Record<SolicitudEstado | "Todos", number>

export type Bandeja = ReturnType<typeof useBandeja>

const MS_BUSQUEDA = 300

/**
 * Estado de la bandeja. Cada cambio de pagina, filtro o busqueda consulta
 * solo esas 10 filas en el servidor: nunca se traen todas a memoria.
 */
export function useBandeja({
  paginaInicial,
  conteosIniciales,
  categoria,
}: {
  paginaInicial: PaginaSolicitudes
  conteosIniciales: Conteos
  categoria: "activas" | "gestionadas"
}) {
  const [estadoFiltro, setEstadoFiltro] = React.useState<
    SolicitudEstado | "Todos"
  >("Todos")
  const [busqueda, setBusqueda] = React.useState("")
  const [datos, setDatos] = React.useState(paginaInicial)
  // Los conteos del panel de filtros son por categoria: los que llegan del
  // layout son de "activas", asi que al cambiar de pestana se vuelven a pedir.
  const [conteos, setConteos] = React.useState(conteosIniciales)
  // Al cambiar de categoria se reinicia el estado durante el render, que es
  // lo que React recomienda en vez de un efecto con setState.
  const [categoriaPrevia, setCategoriaPrevia] = React.useState(categoria)

  const [cargando, setCargando] = React.useState(false)

  if (categoria !== categoriaPrevia) {
    setCategoriaPrevia(categoria)
    setEstadoFiltro("Todos")
    setBusqueda("")
    // La lista se vacia en vez de quedarse con la de la otra pestana: asi la
    // vista pinta su esqueleto mientras llega la primera pagina de esta
    // categoria (la pide el efecto de abajo).
    setDatos({ solicitudes: [], total: 0, pagina: 1, totalPaginas: 1 })
    setCargando(true)
  }

  // Se ignoran las respuestas de peticiones viejas (el usuario ya escribio mas).
  const peticion = React.useRef(0)

  const consultar = React.useCallback(
    async (opciones: {
      pagina: number
      estado: SolicitudEstado | "Todos"
      texto: string
    }) => {
      const actual = ++peticion.current
      setCargando(true)

      // Los conteos van en el mismo viaje: dependen de la categoria, y
      // gestionar una solicitud cambia de que lado cae.
      const [resultado, totales] = await Promise.all([
        cargarPagina({
          categoria,
          pagina: opciones.pagina,
          estado: opciones.estado === "Todos" ? undefined : opciones.estado,
          busqueda: opciones.texto || undefined,
        }),
        cargarConteos(categoria),
      ])

      if (actual !== peticion.current) return

      setDatos(resultado)
      setConteos(totales)
      setCargando(false)
    },
    [categoria]
  )

  const irAPagina = React.useCallback(
    (pagina: number) =>
      consultar({ pagina, estado: estadoFiltro, texto: busqueda }),
    [consultar, estadoFiltro, busqueda]
  )

  const filtrarPorEstado = React.useCallback(
    (estado: SolicitudEstado | "Todos") => {
      setEstadoFiltro(estado)
      // Al cambiar el filtro se vuelve a la primera pagina.
      consultar({ pagina: 1, estado, texto: busqueda })
    },
    [consultar, busqueda]
  )

  // La busqueda espera a que el usuario deje de escribir. En el primer render
  // no se consulta: la pagina ya viene del servidor.
  //
  // `consultar` cambia cuando cambia la categoria, asi que este mismo efecto
  // es el que trae la primera pagina de la otra pestana.
  const primeraCarga = React.useRef(true)

  React.useEffect(() => {
    if (primeraCarga.current) {
      primeraCarga.current = false
      return
    }

    const id = setTimeout(() => {
      consultar({ pagina: 1, estado: estadoFiltro, texto: busqueda })
    }, MS_BUSQUEDA)

    return () => clearTimeout(id)
  }, [busqueda, estadoFiltro, consultar])

  return {
    solicitudes: datos.solicitudes,
    total: datos.total,
    pagina: datos.pagina,
    totalPaginas: datos.totalPaginas,
    conteos,
    estadoFiltro,
    busqueda,
    cargando,
    irAPagina,
    filtrarPorEstado,
    buscar: setBusqueda,
  }
}
