import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import * as schema from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

import ws from "ws";
neonConfig.webSocketConstructor = ws;

// Database connection
let db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }
    const pool = new Pool({ connectionString: databaseUrl, ssl: true });
    db = drizzle(pool, { schema });
  }
  return db;
}

// Auth helpers
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedBuf = Buffer.from(hash, "hex");
  return storedBuf.length === buf.length && timingSafeEqual(buf, storedBuf);
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Response helper
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// Auth middleware
async function getUserFromToken(token: string | null) {
  if (!token) return null;
  const database = getDb();
  const sessions = await database
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.token, token));
  if (sessions.length === 0) return null;
  const users = await database
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, sessions[0].userId));
  return users[0] || null;
}

export const handler = async (event: any, context: any) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  const path = event.path.replace("/.netlify/functions/api", "").replace("/api", "");
  const method = event.httpMethod;
  const body = event.body ? JSON.parse(event.body) : null;
  const authToken = event.headers.authorization?.replace("Bearer ", "");

  try {
    const database = getDb();

    // AUTH ROUTES
    if (path === "/login" && method === "POST") {
      const { username, password } = body;
      const users = await database
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, username));

      if (users.length === 0) {
        return errorResponse("Usuario no encontrado", 401);
      }

      const user = users[0];
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return errorResponse("Contraseña incorrecta", 401);
      }

      const token = generateToken();
      await database.insert(schema.sessions).values({
        token,
        userId: user.id,
      });

      return jsonResponse({
        token,
        user: { id: user.id, username: user.username, role: user.role },
      });
    }

    if (path === "/logout" && method === "POST") {
      if (authToken) {
        await database.delete(schema.sessions).where(eq(schema.sessions.token, authToken));
      }
      return jsonResponse({ success: true });
    }

    if (path === "/me" && method === "GET") {
      const user = await getUserFromToken(authToken);
      if (!user) return errorResponse("No autenticado", 401);
      return jsonResponse({ user: { id: user.id, username: user.username, role: user.role } });
    }

    // PROTECTED ROUTES - Require auth
    const user = await getUserFromToken(authToken);
    if (!user) {
      return errorResponse("No autenticado", 401);
    }

    // VEHICLES ROUTES
    if (path === "/vehicles" && method === "GET") {
      const vehicles = await database.select().from(schema.vehicles).orderBy(desc(schema.vehicles.createdAt));
      return jsonResponse(vehicles);
    }

    if (path === "/vehicles" && method === "POST") {
      const { name, licensePlate, type, soatExpiry, rtmExpiry } = body;
      const result = await database.insert(schema.vehicles).values({
        name,
        licensePlate,
        type,
        soatExpiry,
        rtmExpiry,
        createdBy: user.id,
      }).returning();
      return jsonResponse(result[0], 201);
    }

    if (path.match(/^\/vehicles\/[^/]+$/) && method === "PUT") {
      const id = path.split("/")[2];
      const { name, licensePlate, type, soatExpiry, rtmExpiry } = body;
      const result = await database
        .update(schema.vehicles)
        .set({ name, licensePlate, type, soatExpiry, rtmExpiry, updatedAt: new Date() })
        .where(eq(schema.vehicles.id, id))
        .returning();
      return jsonResponse(result[0]);
    }

    if (path.match(/^\/vehicles\/[^/]+$/) && method === "DELETE") {
      const id = path.split("/")[2];
      await database.delete(schema.vehicles).where(eq(schema.vehicles.id, id));
      return jsonResponse({ success: true });
    }

    // INSPECTIONS ROUTES
    if (path === "/inspections" && method === "GET") {
      const inspections = await database
        .select()
        .from(schema.inspections)
        .orderBy(desc(schema.inspections.createdAt));
      return jsonResponse(inspections);
    }

    if (path === "/inspections" && method === "POST") {
      const { date, vehicleId, inspector, driverName, startTime, endTime, notes, completed, inspectorSignature, driverSignature, items } = body;

      const result = await database.insert(schema.inspections).values({
        date,
        vehicleId,
        inspector,
        driverName,
        startTime,
        endTime,
        notes,
        completed,
        inspectorSignature,
        driverSignature,
        createdBy: user.id,
      }).returning();

      const inspection = result[0];

      // Insert items if provided
      if (items && items.length > 0) {
        const itemsToInsert = items.map((item: any) => ({
          inspectionId: inspection.id,
          name: item.name,
          status: item.status,
          notes: item.notes,
          category: item.category,
          sortOrder: item.sortOrder,
        }));
        await database.insert(schema.inspectionItems).values(itemsToInsert);
      }

      return jsonResponse(inspection, 201);
    }

    if (path.match(/^\/inspections\/[^/]+$/) && method === "GET") {
      const id = path.split("/")[2];
      const inspections = await database
        .select()
        .from(schema.inspections)
        .where(eq(schema.inspections.id, id));

      if (inspections.length === 0) {
        return errorResponse("Inspección no encontrada", 404);
      }

      const items = await database
        .select()
        .from(schema.inspectionItems)
        .where(eq(schema.inspectionItems.inspectionId, id));

      const vehicles = await database
        .select()
        .from(schema.vehicles)
        .where(eq(schema.vehicles.id, inspections[0].vehicleId));

      return jsonResponse({
        ...inspections[0],
        items,
        vehicle: vehicles[0] || null,
      });
    }

    if (path.match(/^\/inspections\/[^/]+$/) && method === "PUT") {
      const id = path.split("/")[2];
      const updateData = { ...body, updatedAt: new Date() };

      const result = await database
        .update(schema.inspections)
        .set(updateData)
        .where(eq(schema.inspections.id, id))
        .returning();

      return jsonResponse(result[0]);
    }

    if (path.match(/^\/inspections\/[^/]+$/) && method === "DELETE") {
      const id = path.split("/")[2];
      await database.delete(schema.inspectionItems).where(eq(schema.inspectionItems.inspectionId, id));
      await database.delete(schema.inspections).where(eq(schema.inspections.id, id));
      return jsonResponse({ success: true });
    }

    // INSPECTION ITEMS ROUTES
    if (path === "/inspection-items" && method === "POST") {
      const result = await database.insert(schema.inspectionItems).values(body).returning();
      return jsonResponse(result[0], 201);
    }

    if (path.match(/^\/inspection-items\/[^/]+$/) && method === "PUT") {
      const id = path.split("/")[2];
      const result = await database
        .update(schema.inspectionItems)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(schema.inspectionItems.id, id))
        .returning();
      return jsonResponse(result[0]);
    }

    return errorResponse("Ruta no encontrada", 404);
  } catch (error: any) {
    console.error("API Error:", error);
    return errorResponse(error.message || "Error interno del servidor", 500);
  }
};
