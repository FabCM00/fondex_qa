import { VistaUsuarios } from "@/components/admin/vista-usuarios"
import { ContenidoPrincipal } from "@/components/contenido-principal"
import { VistaEdicionMotor } from "@/components/motores/vista-edicion-motor"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { SidebarInset } from "@/components/ui/sidebar"
import { exigirSesion } from "@/lib/auth/sesion"
import { contarPorEstado, listarSolicitudes } from "@/lib/solicitudes/repo"

export default async function Layout() {
  const usuario = await exigirSesion("/admin")
  // Solo la primera pagina: el resto se pide al saltar de pagina.
  const [pagina, conteos] = await Promise.all([
    listarSolicitudes({ categoria: "activas", pagina: 1 }),
    contarPorEstado("activas"),
  ])

  return (
    <DashboardShell
      usuario={usuario}
      paginaInicial={pagina}
      conteosIniciales={conteos}
    >
      <SidebarInset className="h-svh overflow-hidden">
        <DashboardHeader />
        <ContenidoPrincipal
          vistaUsuarios={<VistaUsuarios />}
          vistaEdicionMotor={<VistaEdicionMotor />}
        />
      </SidebarInset>
    </DashboardShell>
  )
}
