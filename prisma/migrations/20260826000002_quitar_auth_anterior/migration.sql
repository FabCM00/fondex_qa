-- Saca lo que quedaba del esquema de autenticacion anterior.
--
-- Better Auth usa cuatro tablas: "User", session, account y verification. El
-- reset de contrasena y las invitaciones pasan por `verification`, y no hay
-- login por codigo, asi que estas tres tablas no las consulta nadie:
--
--   PasswordResetToken (14 filas)  -> lo reemplaza verification
--   LoginOtp           (12 filas)  -> no hay OTP en la app
--   InvitationToken     (6 filas)  -> lo reemplaza verification
--
-- Igual las dos columnas de "User" que solo servian a ese esquema. El hash de
-- la contrasena de la app vive en account.password, no en User.passwordHash:
-- las contrasenas del sistema anterior no son utilizables desde aqui.
--
-- No toca ninguna tabla del motor.

DROP TABLE IF EXISTS "PasswordResetToken";
DROP TABLE IF EXISTS "LoginOtp";
DROP TABLE IF EXISTS "InvitationToken";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "passwordHash",
  DROP COLUMN IF EXISTS "otpEnabled";
