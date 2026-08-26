import Link from "next/link"

import { Button } from "@/components/ui/button"
import { FileQuestionIcon } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <FileQuestionIcon className="size-10 text-primary" />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Página no encontrada</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          La ruta que buscas no existe o fue movida.
        </p>
      </div>
      {/* nativeButton={false}: el render es un <a>, no un <button>. */}
      <Button nativeButton={false} render={<Link href="/" />}>
        Ir al inicio
      </Button>
    </div>
  )
}
