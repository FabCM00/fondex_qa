-- Historial de ejecuciones del motor.
--
-- `motor_process_results` sigue teniendo una sola fila vigente por radicado
-- (por eso el JOIN de la bandeja no cambia); aqui se archiva cada version
-- anterior antes de sobrescribirla, incluida la que produjo el motor
-- automatico.
--
-- Solo agrega una tabla: no toca ningun dato existente.

CREATE TABLE IF NOT EXISTS "motor_ejecuciones" (
    "id" BIGSERIAL NOT NULL,
    "radicado" TEXT NOT NULL,
    "request_json" JSONB,
    "response_json" JSONB,
    "ejecutado_por" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motor_ejecuciones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_motor_ejecuciones_radicado"
  ON "motor_ejecuciones"("radicado", "created_at" DESC);

DO $$ BEGIN
  ALTER TABLE "motor_ejecuciones"
    ADD CONSTRAINT "fk_motor_ejecuciones_valida1"
    FOREIGN KEY ("radicado") REFERENCES "valida1_results"("radicado")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
