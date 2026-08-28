import { VistaPanel } from "@/components/panel/vista-panel"
import { listarColaboradores } from "@/lib/admin/usuarios"
import type { UsuarioSesion } from "@/lib/auth/sesion"
import { listarCampos } from "@/lib/motores/repo"
import { MOTOR_POR_DEFECTO, MOTORES } from "@/lib/motores/schema"

// Server Component: los KPIs solo se calculan si el usuario es ADMIN.
export async function VistaPanelServer({ usuario }: { usuario: UsuarioSesion }) {
  if (usuario.rol !== "ADMIN") {
    return <VistaPanel kpis={null} />
  }

  const [usuarios, campos] = await Promise.all([
    listarColaboradores(),
    listarCampos(MOTOR_POR_DEFECTO),
  ])

  return (
    <VistaPanel
      kpis={{
        usuarios: usuarios.length,
        campos: campos.length,
        motores: MOTORES.length,
      }}
    />
  )
}
