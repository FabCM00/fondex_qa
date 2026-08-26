// Prisma 7 ya no carga .env automaticamente: lo hacemos aqui.
import "dotenv/config"

import { defineConfig, env } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
})
