"use client"

import * as React from "react"

import {
  cambiarEstadoUsuario,
  eliminarUsuario,
  invitarUsuarios,
  recargarUsuarios,
  reenviarInvitacion,
  type Resultado,
} from "@/lib/admin/acciones"
import type { UsuarioAdmin } from "@/lib/admin/usuarios"
import type { Rol } from "@/lib/auth/roles"
import { DialogoInvitar } from "@/components/admin/dialogo-invitar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DialogoConfirmar } from "@/components/ui/dialogo-confirmar"
import { Input } from "@/components/ui/input"
import { useNotificaciones } from "@/components/ui/notificaciones"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CircleSlashIcon,
  ListFilterIcon,
  LoaderCircleIcon,
  MailPlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

const POR_PAGINA = 8

const CABECERAS = [
  "Usuario",
  "Correo",
  "Rol",
  "Estado",
  "Fecha creado",
  "Acciones",
]

type Estado = "todos" | "activo" | "inactivo"

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
}

export function TablaUsuarios({ inicial }: { inicial: UsuarioAdmin[] }) {
  const { notificar, actualizar } = useNotificaciones()
  const [usuarios, setUsuarios] = React.useState(inicial)
  // Usuario en espera de confirmacion para eliminar.
  const [porEliminar, setPorEliminar] = React.useState<UsuarioAdmin | null>(
    null
  )
  const [pendiente, setPendiente] = React.useState<string | null>(null)
  const [pagina, setPagina] = React.useState(1)

  // Filtros: busqueda general + por columna.
  const [busqueda, setBusqueda] = React.useState("")
  const [filtrosOpen, setFiltrosOpen] = React.useState(false)
  const [filtroNombre, setFiltroNombre] = React.useState("")
  const [filtroCorreo, setFiltroCorreo] = React.useState("")
  const [filtroEstado, setFiltroEstado] = React.useState<Estado>("todos")
  const [filtroCreado, setFiltroCreado] = React.useState("")

  const filtrosActivos =
    (filtroNombre ? 1 : 0) +
    (filtroCorreo ? 1 : 0) +
    (filtroEstado !== "todos" ? 1 : 0) +
    (filtroCreado ? 1 : 0)

  const contiene = (valor: string, patron: string) =>
    patron === "" || valor.toLowerCase().includes(patron.trim().toLowerCase())

  const termino = busqueda.trim().toLowerCase()
  const visibles = usuarios.filter(
    (usuario) =>
      (termino === "" ||
        usuario.nombre.toLowerCase().includes(termino) ||
        usuario.email.toLowerCase().includes(termino)) &&
      contiene(usuario.nombre, filtroNombre) &&
      contiene(usuario.email, filtroCorreo) &&
      contiene(usuario.creado, filtroCreado) &&
      (filtroEstado === "todos" ||
        (filtroEstado === "activo" ? usuario.activo : !usuario.activo))
  )

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA))
  // Si la pagina actual se queda sin filas (por filtro o borrado), retrocede.
  const paginaActual = Math.min(pagina, totalPaginas)
  const desde = (paginaActual - 1) * POR_PAGINA
  const enPagina = visibles.slice(desde, desde + POR_PAGINA)

  const limpiarFiltros = () => {
    setFiltroNombre("")
    setFiltroCorreo("")
    setFiltroEstado("todos")
    setFiltroCreado("")
    setPagina(1)
  }

  // Toda accion pasa por el Server Action, que exige rol ADMIN en el servidor.
  const ejecutar = async (
    id: string,
    enCurso: string,
    accion: () => Promise<Resultado>
  ) => {
    setPendiente(id)
    const notificacion = notificar(enCurso, "cargando")

    const resultado = await accion()
    actualizar(
      notificacion,
      resultado.mensaje,
      resultado.ok ? "exito" : "error"
    )

    if (resultado.ok) {
      setUsuarios(await recargarUsuarios())
    }

    setPendiente(null)
  }

  const invitar = (correos: string[], rol: Rol) =>
    ejecutar(
      "invitar",
      correos.length === 1
        ? "Enviando invitación..."
        : `Enviando ${correos.length} invitaciones...`,
      () => invitarUsuarios(correos, rol)
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="h-9 rounded-full ps-9"
            value={busqueda}
            onChange={(evento) => {
              setBusqueda(evento.target.value)
              setPagina(1)
            }}
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          className="relative size-9 shrink-0"
          aria-label="Filtros"
          aria-expanded={filtrosOpen}
          onClick={() => setFiltrosOpen((valor) => !valor)}
        >
          <ListFilterIcon />
          {filtrosActivos > 0 && (
            <span className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {filtrosActivos}
            </span>
          )}
        </Button>

        <div className="ms-auto">
          <DialogoInvitar onInvitar={invitar} />
        </div>
      </div>

      {filtrosOpen && (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Filtrar por campo
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={limpiarFiltros}
              disabled={filtrosActivos === 0}
            >
              <XIcon />
              Limpiar
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Usuario</span>
              <Input
                value={filtroNombre}
                placeholder="Nombre..."
                onChange={(evento) => {
                  setFiltroNombre(evento.target.value)
                  setPagina(1)
                }}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Correo</span>
              <Input
                value={filtroCorreo}
                placeholder="@wantnget..."
                onChange={(evento) => {
                  setFiltroCorreo(evento.target.value)
                  setPagina(1)
                }}
              />
            </label>

            <div className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Estado</span>
              <div className="flex gap-1">
                {(["todos", "activo", "inactivo"] as Estado[]).map((opcion) => (
                  <Button
                    key={opcion}
                    variant={filtroEstado === opcion ? "default" : "outline"}
                    size="sm"
                    className="flex-1 capitalize"
                    onClick={() => {
                      setFiltroEstado(opcion)
                      setPagina(1)
                    }}
                  >
                    {opcion}
                  </Button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Fecha creado</span>
              <Input
                value={filtroCreado}
                placeholder="ene 2026..."
                onChange={(evento) => {
                  setFiltroCreado(evento.target.value)
                  setPagina(1)
                }}
              />
            </label>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-[10px] tracking-wide text-muted-foreground uppercase">
              {CABECERAS.map((cabecera) => (
                <th
                  key={cabecera}
                  className={`px-4 py-3 font-medium ${
                    cabecera === "Acciones" ? "text-end" : "text-start"
                  }`}
                >
                  {cabecera}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enPagina.length === 0 ? (
              <tr>
                <td
                  colSpan={CABECERAS.length}
                  className="px-4 py-10 text-center text-xs text-muted-foreground"
                >
                  Ningún colaborador coincide con los filtros.
                </td>
              </tr>
            ) : (
              enPagina.map((usuario) => {
                const ocupado = pendiente === usuario.id
                return (
                  <tr
                    key={usuario.id}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 rounded-lg">
                          <AvatarFallback className="rounded-lg bg-primary/15 text-xs font-medium">
                            {iniciales(usuario.nombre)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium capitalize">
                          {usuario.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {usuario.email}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          aria-hidden="true"
                          className={`size-1.5 rounded-full ${
                            usuario.activo
                              ? "bg-emerald-500"
                              : "bg-muted-foreground/40"
                          }`}
                        />
                        {usuario.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {usuario.creado}
                    </td>
                    <td className="px-4 py-4 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        {ocupado && (
                          <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={ocupado}
                          onClick={() =>
                            ejecutar(
                              usuario.id,
                              usuario.activo
                                ? "Inactivando cuenta..."
                                : "Activando cuenta...",
                              () =>
                                cambiarEstadoUsuario(
                                  usuario.id,
                                  !usuario.activo
                                )
                            )
                          }
                        >
                          {usuario.activo ? (
                            <>
                              <CircleSlashIcon />
                              Inactivar
                            </>
                          ) : (
                            <>
                              <CircleCheckIcon />
                              Activar
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={ocupado}
                          onClick={() =>
                            ejecutar(
                              usuario.id,
                              "Reenviando invitación...",
                              () => reenviarInvitacion(usuario.id)
                            )
                          }
                        >
                          <MailPlusIcon />
                          Invitar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={ocupado}
                          onClick={() => setPorEliminar(usuario)}
                        >
                          <Trash2Icon />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <DialogoConfirmar
        abierto={porEliminar !== null}
        onOpenChange={(abierto) => !abierto && setPorEliminar(null)}
        titulo="¿Eliminar colaborador?"
        descripcion={
          <>
            Se eliminará la cuenta de{" "}
            <span className="font-medium text-foreground">
              {porEliminar?.email}
            </span>{" "}
            y todas sus sesiones. Esta acción no se puede deshacer.
          </>
        }
        textoConfirmar="Eliminar"
        onConfirmar={() => {
          if (!porEliminar) return
          const id = porEliminar.id
          setPorEliminar(null)
          ejecutar(id, "Eliminando colaborador...", () => eliminarUsuario(id))
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {visibles.length === 0
            ? "Sin resultados"
            : `Mostrando ${desde + 1}-${desde + enPagina.length} de ${visibles.length} colaboradores`}
        </p>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Página anterior"
            disabled={paginaActual <= 1}
            onClick={() => setPagina(paginaActual - 1)}
          >
            <ChevronLeftIcon />
          </Button>

          {Array.from({ length: totalPaginas }, (_, indice) => indice + 1).map(
            (numero) => (
              <Button
                key={numero}
                variant={numero === paginaActual ? "default" : "outline"}
                size="icon-sm"
                aria-current={numero === paginaActual ? "page" : undefined}
                onClick={() => setPagina(numero)}
              >
                {numero}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Página siguiente"
            disabled={paginaActual >= totalPaginas}
            onClick={() => setPagina(paginaActual + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
