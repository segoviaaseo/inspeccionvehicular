import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Usar DATABASE_URL si está disponible, sino construir desde variables de Supabase
const getDatabaseUrl = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Si tenemos variables de Supabase, construir la URL
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    // Extraer project ref de la URL
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    // Usar el pooler de Supabase para conexiones
    return `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres'}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
  }

  throw new Error("DATABASE_URL or VITE_SUPABASE_URL must be configured");
};

const databaseUrl = getDatabaseUrl();

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: true
});

export const db = drizzle(pool, { schema });

// Log para debugging (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log('[DB] Connected to database');
}
