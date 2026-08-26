-- Segundo factor (TOTP) para el login con contrasena.
--
-- Quien entra por Microsoft no lo necesita: Entra ID ya pone su propio MFA.
-- Esto cubre la otra puerta, que hoy solo pide una contrasena.
--
-- `failedVerificationCount` y `lockedUntil` frenan la fuerza bruta: seis
-- digitos se adivinan rapido si se puede intentar sin limite.
--
-- Solo agrega una tabla y una columna con default: no toca ningun dato.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "twoFactor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(6),

    CONSTRAINT "twoFactor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_two_factor_userid" ON "twoFactor"("userId");

DO $$ BEGIN
  ALTER TABLE "twoFactor"
    ADD CONSTRAINT "twoFactor_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
