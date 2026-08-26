import { TablaUsuarios } from "@/components/admin/tabla-usuarios"
import { listarColaboradores } from "@/lib/admin/usuarios"
import { exigirRol } from "@/lib/auth/sesion"

// Server Component: los datos salen de la DB y la tabla solo los pinta.
export async function VistaUsuarios() {
  await exigirRol("ADMIN")
  const usuarios = await listarColaboradores()

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Listado de Colaboradores</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de usuarios y permisos de acceso a la plataforma.
          </p>
        </div>
        <TablaUsuarios inicial={usuarios} />
      </div>
    </div>
  )
}
