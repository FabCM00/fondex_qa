-- Deja "User" como Better Auth la espera.
--
-- La tabla venia del sistema anterior con `emailVerified` como timestamptz (la
-- fecha de verificacion) y `name` nullable. Better Auth escribe un booleano en
-- `emailVerified` y siempre manda `name`, asi que las consultas fallaban al
-- crear o leer usuarios.
--
-- Los usuarios del sistema anterior se borran: sus contrasenas vivian en
-- `User.passwordHash`, que ya no existe, asi que ninguno podia entrar. Se
-- recrean con `pnpm db:seed`.
--
-- No toca ninguna tabla del motor.

DELETE FROM "User";

-- emailVerified: de fecha a booleano.
ALTER TABLE "User"
  ALTER COLUMN "emailVerified" DROP DEFAULT,
  ALTER COLUMN "emailVerified" TYPE BOOLEAN USING ("emailVerified" IS NOT NULL),
  ALTER COLUMN "emailVerified" SET NOT NULL,
  ALTER COLUMN "emailVerified" SET DEFAULT false;

-- name: Better Auth siempre lo manda.
ALTER TABLE "User"
  ALTER COLUMN "name" SET NOT NULL;
