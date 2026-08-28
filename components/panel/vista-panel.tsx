"use client"

import Image from "next/image"

import { useDashboard } from "@/components/dashboard-context"
import { MARCA } from "@/lib/marca"
import {
  VISTA_ACTIVAS,
  VISTA_EDICION_MOTOR,
  VISTA_USUARIOS,
} from "@/lib/navegacion"
import {
  ArrowRightIcon,
  CogIcon,
  SlidersHorizontalIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

type Kpis = {
  usuarios: number
  campos: number
  motores: number
}

const ACCESOS_ADMIN = [
  {
    vista: VISTA_USUARIOS,
    etiqueta: "Módulo de usuarios",
    titulo: "Gestión de usuarios",
    descripcion: "Colaboradores, roles y permisos de acceso.",
    icono: "/users.svg",
  },
  {
    vista: VISTA_EDICION_MOTOR,
    etiqueta: "Módulo de parámetros",
    titulo: "Edición del motor",
    descripcion: "Configura los campos que usa el motor.",
    icono: "/parameters.svg",
  },
] as const

export function VistaPanel({ kpis }: { kpis: Kpis | null }) {
  const { usuario, seleccionarVista } = useDashboard()

  const accesos =
    usuario.rol === "ADMIN"
      ? ACCESOS_ADMIN.map((acceso) => ({ ...acceso }))
      : [
          {
            vista: VISTA_ACTIVAS,
            etiqueta: "Módulo de solicitudes",
            titulo: "Bandeja de solicitudes",
            descripcion: "Revisa y gestiona tus solicitudes activas.",
            icono: "/bandeja.svg",
          },
        ]

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto p-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-14">
        <h1 className="text-4xl font-semibold">
          Bienvenido, {usuario.nombre.split(" ")[0]} · {MARCA.cooperativa}
        </h1>

        {kpis && (
          <div className="flex flex-col gap-5">
            <h2 className="text-xl font-medium">Registros datos</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <TarjetaKpi titulo="Total de usuarios" valor={kpis.usuarios} Icono={UsersIcon} />
              <TarjetaKpi titulo="Campos configurados" valor={kpis.campos} Icono={SlidersHorizontalIcon} />
              <TarjetaKpi titulo="Motores" valor={kpis.motores} Icono={CogIcon} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <h2 className="text-xl font-medium">Accesos rápidos</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {accesos.map((acceso) => (
              <TarjetaAcceso
                key={acceso.vista}
                etiqueta={acceso.etiqueta}
                titulo={acceso.titulo}
                descripcion={acceso.descripcion}
                icono={acceso.icono}
                onClick={() => seleccionarVista(acceso.vista)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TarjetaKpi({
  titulo,
  valor,
  Icono,
}: {
  titulo: string
  valor: number
  Icono: LucideIcon
}) {
  return (
    <div className="flex items-center gap-6 rounded-2xl border px-8 py-8">
      <Icono className="size-12 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-5xl font-semibold tabular-nums">{valor}</span>
        <span className="text-base text-muted-foreground">{titulo}</span>
      </div>
    </div>
  )
}

function TarjetaAcceso({
  etiqueta,
  titulo,
  descripcion,
  icono,
  onClick,
}: {
  etiqueta: string
  titulo: string
  descripcion: string
  icono: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-8 rounded-2xl border p-10 text-start transition-colors hover:bg-muted/40"
    >
      <Image src={icono} alt="" width={128} height={128} className="shrink-0" />
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
          {etiqueta}
        </span>
        <span className="text-2xl font-semibold">{titulo}</span>
        <span className="text-base text-muted-foreground">{descripcion}</span>
      </div>
      <ArrowRightIcon className="size-7 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
