-- BASELINE
--
-- Estas tablas YA EXISTEN en coopvalili_db con datos productivos: las creo el
-- sistema anterior, no Prisma Migrate. Esta migracion solo las describe para
-- que el historial este completo y para poder levantar una base vacia desde
-- cero (dev/CI).
--
-- Contra la base real se marca como aplicada sin ejecutarse:
--   prisma migrate resolve --applied 20260826000000_baseline_datos_motor
--
-- Todo va con IF NOT EXISTS por si acaso: nada de lo de aqui debe tocar datos.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMPTZ(6),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "otpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LoginOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InvitationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "valida1_results" (
    "id" BIGSERIAL NOT NULL,
    "radicado" TEXT NOT NULL,
    "cedula" TEXT,
    "request_json" JSONB,
    "response_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gestionado_at" TIMESTAMPTZ(6),
    "gestionado_by" TEXT,
    "estado_manual" TEXT,
    "estado_manual_at" TIMESTAMPTZ(6),
    "estado_manual_by" TEXT,

    CONSTRAINT "valida1_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "documentos" (
    "id" BIGSERIAL NOT NULL,
    "radicado" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "container" TEXT NOT NULL DEFAULT 'documentos',
    "blob_name" TEXT NOT NULL,
    "nombre_original" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" BIGINT,
    "sha256" CHAR(64),
    "etag" TEXT,
    "tipo_documento" TEXT NOT NULL DEFAULT 'Documentos generales',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "subido_por" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "firma_solicitudes" (
    "id" BIGSERIAL NOT NULL,
    "documento_id" BIGINT NOT NULL,
    "radicado" TEXT NOT NULL,
    "zapsign_token" TEXT NOT NULL,
    "zapsign_open_id" INTEGER,
    "sign_url" TEXT,
    "signer_token" TEXT,
    "firmante_nombre" TEXT NOT NULL,
    "firmante_email" TEXT,
    "firmante_phone" TEXT,
    "canal_email" BOOLEAN NOT NULL DEFAULT true,
    "canal_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "etag_original" TEXT,
    "webhook_json" JSONB,
    "enviado_por" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "signed_at" TIMESTAMPTZ(6),

    CONSTRAINT "firma_solicitudes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "identity_validations" (
    "id" BIGSERIAL NOT NULL,
    "radicado" TEXT,
    "cedula" TEXT,
    "request_json" JSONB,
    "response_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "motor_data_results" (
    "id" BIGSERIAL NOT NULL,
    "radicado" TEXT,
    "cedula" TEXT,
    "request_json" JSONB,
    "response_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motor_data_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "motor_process_results" (
    "id" BIGSERIAL NOT NULL,
    "radicado" TEXT NOT NULL,
    "cedula" TEXT,
    "request_json" JSONB,
    "response_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motor_process_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "credito_decisiones" (
    "id" BIGSERIAL NOT NULL,
    "radicado" TEXT NOT NULL,
    "request_json" JSONB,
    "response_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credito_decisiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "document_results" (
    "id" BIGSERIAL NOT NULL,
    "radicado" TEXT,
    "cedula" TEXT,
    "request_json" JSONB,
    "response_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "datos_asociado" (
    "id" BIGSERIAL NOT NULL,
    "cedula" TEXT NOT NULL,
    "primer_apellido" TEXT,
    "nombre" TEXT,
    "nombre_asociado" TEXT,
    "ciudad" TEXT,
    "cliente_empresa" TEXT,
    "estado_civil" TEXT,
    "estado_civil_norm" TEXT,
    "tipo_vivienda" TEXT,
    "nivel" TEXT,
    "usuario_credito" TEXT,
    "fecha_ingreso" TEXT,
    "fecha_ingreso_empresa" TEXT,
    "edad" DECIMAL,
    "personas_cargo" DECIMAL,
    "antiguedad_coop" DECIMAL,
    "antiguedad_laboral" DECIMAL,
    "salario" DECIMAL,
    "aportes" DECIMAL,
    "deuda_coopvalili" DECIMAL,
    "cuota_disponible" DECIMAL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "datos_asociado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "User"("email");
CREATE INDEX IF NOT EXISTS "idx_user_role" ON "User"("role");

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX IF NOT EXISTS "idx_password_reset_token" ON "PasswordResetToken"("token");
CREATE INDEX IF NOT EXISTS "idx_password_reset_userid" ON "PasswordResetToken"("userId");

CREATE INDEX IF NOT EXISTS "idx_login_otp_userid" ON "LoginOtp"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "InvitationToken_token_key" ON "InvitationToken"("token");
CREATE INDEX IF NOT EXISTS "idx_invitation_email" ON "InvitationToken"("email");
CREATE INDEX IF NOT EXISTS "idx_invitation_token" ON "InvitationToken"("token");

CREATE UNIQUE INDEX IF NOT EXISTS "valida1_results_radicado_key" ON "valida1_results"("radicado");
CREATE INDEX IF NOT EXISTS "idx_valida1_cedula" ON "valida1_results"("cedula");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_documentos_blob" ON "documentos"("container", "blob_name");
CREATE INDEX IF NOT EXISTS "idx_documentos_radicado" ON "documentos"("radicado");
CREATE INDEX IF NOT EXISTS "idx_documentos_cedula" ON "documentos"("cedula");
CREATE INDEX IF NOT EXISTS "idx_documentos_radicado_estado" ON "documentos"("radicado", "estado");

CREATE UNIQUE INDEX IF NOT EXISTS "firma_solicitudes_zapsign_token_key" ON "firma_solicitudes"("zapsign_token");
CREATE INDEX IF NOT EXISTS "idx_firma_documento" ON "firma_solicitudes"("documento_id");
CREATE INDEX IF NOT EXISTS "idx_firma_radicado" ON "firma_solicitudes"("radicado");
CREATE INDEX IF NOT EXISTS "idx_firma_status" ON "firma_solicitudes"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "identity_validations_radicado_valida1_key" ON "identity_validations"("radicado");
CREATE INDEX IF NOT EXISTS "idx_identity_cedula" ON "identity_validations"("cedula");
CREATE INDEX IF NOT EXISTS "idx_identity_radicado" ON "identity_validations"("radicado");

CREATE INDEX IF NOT EXISTS "idx_motor_data_cedula" ON "motor_data_results"("cedula");
CREATE INDEX IF NOT EXISTS "idx_motor_data_radicado" ON "motor_data_results"("radicado");

CREATE UNIQUE INDEX IF NOT EXISTS "motor_process_results_radicado_key" ON "motor_process_results"("radicado");
CREATE INDEX IF NOT EXISTS "idx_motor_process_cedula" ON "motor_process_results"("cedula");

CREATE UNIQUE INDEX IF NOT EXISTS "credito_decisiones_radicado_key" ON "credito_decisiones"("radicado");

CREATE INDEX IF NOT EXISTS "idx_document_cedula" ON "document_results"("cedula");
CREATE INDEX IF NOT EXISTS "idx_document_radicado" ON "document_results"("radicado");

CREATE UNIQUE INDEX IF NOT EXISTS "datos_asociado_cedula_key" ON "datos_asociado"("cedula");
CREATE INDEX IF NOT EXISTS "idx_datos_asociado_cedula" ON "datos_asociado"("cedula");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "fk_password_reset_user" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LoginOtp" ADD CONSTRAINT "fk_login_otp_user" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "InvitationToken" ADD CONSTRAINT "fk_invitation_invited_by" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "documentos" ADD CONSTRAINT "fk_documentos_valida1" FOREIGN KEY ("radicado") REFERENCES "valida1_results"("radicado") ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "firma_solicitudes" ADD CONSTRAINT "fk_firma_documento" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "identity_validations" ADD CONSTRAINT "fk_identity_valida1" FOREIGN KEY ("radicado") REFERENCES "valida1_results"("radicado") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "motor_data_results" ADD CONSTRAINT "fk_motor_data_valida1" FOREIGN KEY ("radicado") REFERENCES "valida1_results"("radicado") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "motor_process_results" ADD CONSTRAINT "fk_motor_process_valida1" FOREIGN KEY ("radicado") REFERENCES "valida1_results"("radicado") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "credito_decisiones" ADD CONSTRAINT "fk_credito_valida1" FOREIGN KEY ("radicado") REFERENCES "valida1_results"("radicado") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "document_results" ADD CONSTRAINT "fk_document_valida1" FOREIGN KEY ("radicado") REFERENCES "valida1_results"("radicado") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
