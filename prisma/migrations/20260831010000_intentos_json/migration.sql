-- Consumo de intentos por radicado.
--
-- Guarda, por radicado, cuantas veces se uso cada funcion controlada por
-- motor_ajuste (ej: {"permitir_reejecucion": 1, "permitir_envio_score": 0}).
-- El limite sigue viviendo solo en motor_ajuste: aqui solo se cuenta.
--
-- DEFAULT '{}' hace que toda fila, existente o nueva, arranque sin ningun
-- intento consumido sin tener que tocar el codigo que crea la solicitud.

ALTER TABLE "valida1_results"
  ADD COLUMN IF NOT EXISTS "intentos_json" JSONB NOT NULL DEFAULT '{}';
