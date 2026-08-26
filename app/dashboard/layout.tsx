import { ContenidoPrincipal } from "@/components/contenido-principal"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { SidebarInset } from "@/components/ui/sidebar"
import { exigirSesion } from "@/lib/auth/sesion"
import { contarPorEstado, listarSolicitudes } from "@/lib/solicitudes/repo"

// Control de acceso real (el middleware solo hace el redirect rapido) y
// shell compartido: el sidebar se arma con los modulos del rol.
export default async function Layout() {
  const usuario = await exigirSesion("/dashboard")
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
        {/* El colaborador nunca ve la vista de usuarios: no se renderiza. */}
        <ContenidoPrincipal vistaUsuarios={null} />
      </SidebarInset>
    </DashboardShell>
  )
}
