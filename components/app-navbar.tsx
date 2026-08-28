"use client"

import * as React from "react"
import Image from "next/image"

import { useDashboard } from "@/components/dashboard-context"
import { NavUser } from "@/components/nav-user"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MARCA } from "@/lib/marca"
import { MODULOS_POR_ROL } from "@/lib/navegacion"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

/**
 * Navegacion horizontal: cada modulo es un desplegable con sus vistas.
 * Es la alternativa al menu lateral (se elige en Preferencias).
 */
export function AppNavbar() {
  const { usuario, vistaActiva, seleccionarVista } = useDashboard()
  const modulos = MODULOS_POR_ROL[usuario.rol]

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b bg-sidebar px-3">
      <div className="flex items-center gap-2 pe-2">
        <Image
          src={MARCA.logo}
          alt={MARCA.nombre}
          width={24}
          height={24}
          className="size-6 object-contain"
        />
        <span className="hidden items-baseline gap-1.5 text-sm font-medium sm:flex">
          {MARCA.nombre}
          <span className="text-[10px] font-normal text-muted-foreground">
            {MARCA.cooperativa} - {MARCA.version}
          </span>
        </span>
      </div>

      <nav className="flex items-center gap-0.5">
        {modulos.map((modulo) => {
          const activo = modulo.vistas.some(
            (vista) => vista.titulo === vistaActiva
          )

          return (
            <DropdownMenu key={modulo.titulo}>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    data-active={activo || undefined}
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-active:bg-sidebar-primary/10 data-active:font-medium data-active:text-foreground data-open:bg-sidebar-accent"
                  />
                }
              >
                {modulo.titulo}
                <ChevronDownIcon className="size-3.5 opacity-60 transition-transform duration-200 in-data-open:rotate-180" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start" className="min-w-52">
                {modulo.vistas.map((vista) => (
                  <DropdownMenuItem
                    key={vista.titulo}
                    onClick={() => seleccionarVista(vista.titulo)}
                  >
                    <CheckIcon
                      className={
                        vistaActiva === vista.titulo ? "" : "opacity-0"
                      }
                    />
                    {vista.titulo}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        })}
      </nav>

      <div className="ms-auto w-56">
        <NavUser />
      </div>
    </header>
  )
}
