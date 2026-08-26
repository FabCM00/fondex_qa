-- Lo unico que esta app agrega a coopvalili_db.
--
-- Nada de aqui toca las tablas del motor ni sus datos (42 solicitudes, 1785
-- asociados, 23 documentos, etc.): son tres tablas nuevas, el enum de roles y
-- una columna nullable.

-- 1. Roles: la app usa ADMIN y COLABORADOR. La base venia con USER del sistema
--    anterior, y Postgres no deja quitar un valor de un enum, asi que se crea
--    el tipo nuevo y se reapunta cada columna. Las filas que eran USER pasan a
--    COLABORADOR (el rol sin privilegios, que es lo que USER significaba).
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'COLABORADOR');

ALTER TABLE "User"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "Role_new"
    USING (CASE "role"::text WHEN 'ADMIN' THEN 'ADMIN' ELSE 'COLABORADOR' END)::"Role_new",
  ALTER COLUMN "role" SET DEFAULT 'COLABORADOR';

ALTER TABLE "InvitationToken"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "Role_new"
    USING (CASE "role"::text WHEN 'ADMIN' THEN 'ADMIN' ELSE 'COLABORADOR' END)::"Role_new",
  ALTER COLUMN "role" SET DEFAULT 'COLABORADOR';

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- 2. La observacion del negociador al gestionar una solicitud. Nullable y sin
--    default: las 42 filas existentes quedan en NULL.
ALTER TABLE "valida1_results" ADD COLUMN IF NOT EXISTS "gestionado_nota" TEXT;

-- 3. Tablas de Better Auth. `user` ya existe (es "User"), asi que solo faltan
--    session, account y verification.
CREATE TABLE IF NOT EXISTS "session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "issuer" TEXT,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(6),
    "refreshTokenExpiresAt" TIMESTAMPTZ(6),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "session_token_key" ON "session"("token");
CREATE INDEX IF NOT EXISTS "idx_session_token" ON "session"("token");
CREATE INDEX IF NOT EXISTS "idx_session_userid" ON "session"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_account_provider" ON "account"("providerId", "accountId");
CREATE INDEX IF NOT EXISTS "idx_account_userid" ON "account"("userId");

CREATE INDEX IF NOT EXISTS "idx_verification_identifier" ON "verification"("identifier");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
