import { AjustesMotor } from "@/components/motores/ajustes-motor"
import { TablaCampos } from "@/components/motores/tabla-campos"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import { exigirRol } from "@/lib/auth/sesion"
import { listarAjustes, listarCampos } from "@/lib/motores/repo"
import { MOTOR_POR_DEFECTO, MOTORES } from "@/lib/motores/schema"

// Server Component: los datos salen de la DB y la tabla solo los pinta.
export async function VistaEdicionMotor() {
  await exigirRol("ADMIN")

  const motor = MOTOR_POR_DEFECTO
  const [campos, ajustes] = await Promise.all([
    listarCampos(motor),
    listarAjustes(motor),
  ])
  const label = MOTORES.find((item) => item.id === motor)?.label ?? motor

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Edición del motor</h1>
          <p className="text-sm text-muted-foreground">
            Campos que un colaborador puede ajustar antes de volver a ejecutar{" "}
            {label}. Lo que no esté aquí no aparece en el popup.
          </p>
        </div>

        <Tabs defaultValue="campos">
          <TabsList>
            <TabsTab value="campos">Campos del motor</TabsTab>
            <TabsTab value="ajustes">Ajustes del motor</TabsTab>
          </TabsList>

          <TabsPanel value="campos">
            <TablaCampos motor={motor} inicial={campos} />
          </TabsPanel>

          <TabsPanel value="ajustes">
            <AjustesMotor motor={motor} inicial={ajustes} />
          </TabsPanel>
        </Tabs>
      </div>
    </div>
  )
}
