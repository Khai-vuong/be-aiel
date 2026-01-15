import 'dotenv/config'
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { 
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: { 
    url: env("DATABASE_LOCAL_URL") 
    // url: env("DATABASE_SUPABASE_URL_POOLING")
  }
});

