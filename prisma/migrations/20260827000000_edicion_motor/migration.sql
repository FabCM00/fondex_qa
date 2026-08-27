-- Configuracion de edicion del motor.
--
-- Define, por motor y por campo, que se puede editar antes de volver a
-- ejecutar. Los campos se identifican con un path dentro del request_json
-- (`solicitante.salario`) en vez de columnas, para que la misma tabla sirva a
-- cualquier motor que se agregue despues.
--
-- Solo agrega una tabla y un enum: no toca ningun dato existente.

DO $$ BEGIN
  CREATE TYPE "TipoCampoMotor" AS ENUM ('TEXTO', 'NUMERO', 'BOOLEANO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "edicion_motor" (
    "id" BIGSERIAL NOT NULL,
    "motor" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "tipo" "TipoCampoMotor" NOT NULL DEFAULT 'TEXTO',
    "editable" BOOLEAN NOT NULL DEFAULT true,
    "ayuda" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "edicion_motor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_edicion_motor_campo"
  ON "edicion_motor"("motor", "campo");

CREATE INDEX IF NOT EXISTS "idx_edicion_motor_orden"
  ON "edicion_motor"("motor", "orden");
