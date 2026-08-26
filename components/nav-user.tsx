"use client"

import { useDashboard } from "@/components/dashboard-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useCerrarSesion } from "@/lib/auth/usar-cerrar-sesion"
import {
  VISTA_MI_PERFIL,
  VISTA_NOTIFICACIONES,
  VISTA_PREFERENCIAS,
} from "@/lib/navegacion"
import {
  BellIcon,
  ChevronsUpDownIcon,
  LoaderCircleIcon,
  LogOutIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react"

export function NavUser() {
  const { isMobile } = useSidebar()
  const { usuario, seleccionarVista } = useDashboard()
  const { cerrarSesion, cerrando } = useCerrarSesion()

  const iniciales = usuario.nombre
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")

  const accesos = [
    { titulo: VISTA_MI_PERFIL, icono: <UserRoundIcon /> },
    { titulo: VISTA_NOTIFICACIONES, icono: <BellIcon /> },
    { titulo: VISTA_PREFERENCIAS, icono: <SettingsIcon /> },
  ]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="h-10 gap-2 px-1.5 data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-7 rounded-lg">
              <AvatarImage src={usuario.imagen ?? ""} alt={usuario.nombre} />
              <AvatarFallback className="rounded-lg bg-primary/15 text-xs">
                {iniciales}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-start leading-tight">
              <span className="truncate text-sm font-medium">
                {usuario.nombre}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                {usuario.email}
              </span>
            </div>
            <ChevronsUpDownIcon className="ms-auto size-3.5 shrink-0" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-60 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* GroupLabel de Base UI exige un Group padre. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage
                      src={usuario.imagen ?? ""}
                      alt={usuario.nombre}
                    />
                    <AvatarFallback className="rounded-lg bg-primary/15 text-xs">
                      {iniciales}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start leading-tight">
                    <span className="truncate text-sm font-medium">
                      {usuario.nombre}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {usuario.email}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {usuario.rol}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {accesos.map((acceso) => (
                <DropdownMenuItem
                  key={acceso.titulo}
                  onClick={() => seleccionarVista(acceso.titulo)}
                >
                  {acceso.icono}
                  {acceso.titulo}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              disabled={cerrando}
              onClick={cerrarSesion}
            >
              {cerrando ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <LogOutIcon />
              )}
              {cerrando ? "Cerrando sesión..." : "Cerrar sesión"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
