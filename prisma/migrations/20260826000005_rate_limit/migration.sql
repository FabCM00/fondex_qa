-- Contador de peticiones por clave (IP + ruta), para frenar la fuerza bruta
-- contra el login.
--
-- En la base y no en memoria: con varias instancias cada una tendria su propio
-- contador, y bastaria repartir los intentos entre ellas para saltarse el
-- limite.
--
-- Solo agrega una tabla: no toca ningun dato existente.

CREATE TABLE IF NOT EXISTS "rateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    -- Epoch en milisegundos, no timestamp: asi lo escribe Better Auth.
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rateLimit_key_key" ON "rateLimit"("key");
