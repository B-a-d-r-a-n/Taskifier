import { defineConfig, env } from "prisma/config";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});