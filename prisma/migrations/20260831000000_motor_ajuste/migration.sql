-- Ajustes del motor (clave/valor).
--
-- Interruptores y valores de configuracion por motor (permitir reejecucion,
-- intentos permitidos, permitir envio a Score, etc). Se identifican por
-- "clave" en vez de columnas, para que la misma tabla sirva a cualquier
-- ajuste que se agregue despues sin nueva migracion.
--
-- Solo agrega una tabla: no toca ningun dato existente.

CREATE TABLE IF NOT EXISTS "motor_ajuste" (
    "id" BIGSERIAL NOT NULL,
    "motor" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "ayuda" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "valor_numero" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motor_ajuste_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_motor_ajuste_clave"
  ON "motor_ajuste"("motor", "clave");

CREATE INDEX IF NOT EXISTS "idx_motor_ajuste_orden"
  ON "motor_ajuste"("motor", "orden");
