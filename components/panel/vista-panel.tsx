"use client"

import Image from "next/image"

import { useDashboard } from "@/components/dashboard-context"
import {
  VISTA_ACTIVAS,
  VISTA_EDICION_MOTOR,
  VISTA_USUARIOS,
} from "@/lib/navegacion"

type Kpis = {
  usuarios: number
  campos: number
  motores: number
}

const ACCESOS_ADMIN = [
  {
    vista: VISTA_USUARIOS,
    titulo: "Usuarios",
    descripcion: "Gestiona colaboradores y permisos.",
    icono: "/users.svg",
  },
  {
    vista: VISTA_EDICION_MOTOR,
    titulo: "Parámetros",
    descripcion: "Configura los campos del motor.",
    icono: "/parameters.svg",
  },
] as const

export function VistaPanel({ kpis }: { kpis: Kpis | null }) {
  const { usuario, seleccionarVista } = useDashboard()

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">
            Bienvenido, {usuario.nombre.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {usuario.rol === "ADMIN"
              ? "Resumen general de la plataforma."
              : "Accede a tus solicitudes desde aquí."}
          </p>
        </div>

        {kpis && (
          <div className="grid gap-4 sm:grid-cols-3">
            <TarjetaKpi titulo="Usuarios" valor={kpis.usuarios} icono="/users.svg" />
            <TarjetaKpi titulo="Campos configurados" valor={kpis.campos} icono="/parameters.svg" />
            <TarjetaKpi titulo="Motores" valor={kpis.motores} icono="/parameters.svg" />
          </div>
        )}

        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Acceso rápido
          </span>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {usuario.rol === "ADMIN" ? (
              ACCESOS_ADMIN.map((acceso) => (
                <TarjetaAcceso
                  key={acceso.vista}
                  titulo={acceso.titulo}
                  descripcion={acceso.descripcion}
                  icono={acceso.icono}
                  onClick={() => seleccionarVista(acceso.vista)}
                />
              ))
            ) : (
              <TarjetaAcceso
                titulo="Bandeja de solicitudes"
                descripcion="Revisa y gestiona tus solicitudes activas."
                icono="/bandeja.svg"
                onClick={() => seleccionarVista(VISTA_ACTIVAS)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TarjetaKpi({
  titulo,
  valor,
  icono,
}: {
  titulo: string
  valor: number
  icono: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Image src={icono} alt="" width={20} height={20} className="size-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-semibold">{valor}</span>
        <span className="text-xs text-muted-foreground">{titulo}</span>
      </div>
    </div>
  )
}

function TarjetaAcceso({
  titulo,
  descripcion,
  icono,
  onClick,
}: {
  titulo: string
  descripcion: string
  icono: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-lg border p-4 text-start transition-colors hover:bg-muted/40"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Image src={icono} alt="" width={18} height={18} className="size-[18px]" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{titulo}</span>
        <span className="text-xs text-muted-foreground">{descripcion}</span>
      </div>
    </button>
  )
}
