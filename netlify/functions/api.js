var __defProp = Object.defineProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// netlify/functions/api.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  insertInspectionItemSchema: () => insertInspectionItemSchema,
  insertInspectionSchema: () => insertInspectionSchema,
  insertUserSchema: () => insertUserSchema,
  insertVehicleSchema: () => insertVehicleSchema,
  inspectionItems: () => inspectionItems,
  inspections: () => inspections,
  sessions: () => sessions,
  users: () => users,
  vehicles: () => vehicles
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("inspector"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  licensePlate: varchar("license_plate", { length: 20 }).notNull().unique(),
  type: text("type").notNull(),
  soatExpiry: text("soat_expiry"),
  rtmExpiry: text("rtm_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by")
});
var inspections = pgTable("inspections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(),
  vehicleId: varchar("vehicle_id").notNull(),
  inspector: text("inspector").notNull(),
  driverName: text("driver_name"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  notes: text("notes"),
  completed: boolean("completed").default(false),
  inspectorSignature: text("inspector_signature"),
  driverSignature: text("driver_signature"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by")
});
var inspectionItems = pgTable("inspection_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectionId: varchar("inspection_id").notNull(),
  name: text("name").notNull(),
  status: text("status", { enum: ["pass", "fail", "not-checked", "n/a"] }).notNull().default("not-checked"),
  notes: text("notes"),
  category: text("category", { enum: ["technical", "safety", "legal"] }).notNull(),
  sortOrder: text("sort_order").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at")
});
var insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
var insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
var insertInspectionSchema = createInsertSchema(inspections).omit({ id: true, createdAt: true });
var insertInspectionItemSchema = createInsertSchema(inspectionItems).omit({ id: true });

// netlify/functions/api.ts
import { eq, desc } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
neonConfig.webSocketConstructor = __require("ws");
var db = null;
function getDb() {
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }
    const pool = new Pool({ connectionString: databaseUrl, ssl: true });
    db = drizzle(pool, { schema: schema_exports });
  }
  return db;
}
async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const buf = await scryptAsync(password, salt, 64);
  const storedBuf = Buffer.from(hash, "hex");
  return storedBuf.length === buf.length && timingSafeEqual(buf, storedBuf);
}
function generateToken() {
  return randomBytes(32).toString("hex");
}
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
};
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}
async function getUserFromToken(token) {
  if (!token) return null;
  const database = getDb();
  const sessions2 = await database.select().from(sessions).where(eq(sessions.token, token));
  if (sessions2.length === 0) return null;
  const users2 = await database.select().from(users).where(eq(users.id, sessions2[0].userId));
  return users2[0] || null;
}
var handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }
  const path = event.path.replace("/.netlify/functions/api", "").replace("/api", "");
  const method = event.httpMethod;
  const body = event.body ? JSON.parse(event.body) : null;
  const authToken = event.headers.authorization?.replace("Bearer ", "");
  try {
    const database = getDb();
    if (path === "/login" && method === "POST") {
      const { username, password } = body;
      const users2 = await database.select().from(users).where(eq(users.username, username));
      if (users2.length === 0) {
        return errorResponse("Usuario no encontrado", 401);
      }
      const user2 = users2[0];
      const isValid = await verifyPassword(password, user2.password);
      if (!isValid) {
        return errorResponse("Contrase\xF1a incorrecta", 401);
      }
      const token = generateToken();
      await database.insert(sessions).values({
        token,
        userId: user2.id
      });
      return jsonResponse({
        token,
        user: { id: user2.id, username: user2.username, role: user2.role }
      });
    }
    if (path === "/logout" && method === "POST") {
      if (authToken) {
        await database.delete(sessions).where(eq(sessions.token, authToken));
      }
      return jsonResponse({ success: true });
    }
    if (path === "/me" && method === "GET") {
      const user2 = await getUserFromToken(authToken);
      if (!user2) return errorResponse("No autenticado", 401);
      return jsonResponse({ user: { id: user2.id, username: user2.username, role: user2.role } });
    }
    const user = await getUserFromToken(authToken);
    if (!user) {
      return errorResponse("No autenticado", 401);
    }
    if (path === "/vehicles" && method === "GET") {
      const vehicles2 = await database.select().from(vehicles).orderBy(desc(vehicles.createdAt));
      return jsonResponse(vehicles2);
    }
    if (path === "/vehicles" && method === "POST") {
      const { name, licensePlate, type, soatExpiry, rtmExpiry } = body;
      const result = await database.insert(vehicles).values({
        name,
        licensePlate,
        type,
        soatExpiry,
        rtmExpiry,
        createdBy: user.id
      }).returning();
      return jsonResponse(result[0], 201);
    }
    if (path.match(/^\/vehicles\/[^/]+$/) && method === "PUT") {
      const id = path.split("/")[2];
      const { name, licensePlate, type, soatExpiry, rtmExpiry } = body;
      const result = await database.update(vehicles).set({ name, licensePlate, type, soatExpiry, rtmExpiry, updatedAt: /* @__PURE__ */ new Date() }).where(eq(vehicles.id, id)).returning();
      return jsonResponse(result[0]);
    }
    if (path.match(/^\/vehicles\/[^/]+$/) && method === "DELETE") {
      const id = path.split("/")[2];
      await database.delete(vehicles).where(eq(vehicles.id, id));
      return jsonResponse({ success: true });
    }
    if (path === "/inspections" && method === "GET") {
      const inspections2 = await database.select().from(inspections).orderBy(desc(inspections.createdAt));
      return jsonResponse(inspections2);
    }
    if (path === "/inspections" && method === "POST") {
      const { date, vehicleId, inspector, driverName, startTime, endTime, notes, completed, inspectorSignature, driverSignature, items } = body;
      const result = await database.insert(inspections).values({
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
        createdBy: user.id
      }).returning();
      const inspection = result[0];
      if (items && items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          inspectionId: inspection.id,
          name: item.name,
          status: item.status,
          notes: item.notes,
          category: item.category,
          sortOrder: item.sortOrder
        }));
        await database.insert(inspectionItems).values(itemsToInsert);
      }
      return jsonResponse(inspection, 201);
    }
    if (path.match(/^\/inspections\/[^/]+$/) && method === "GET") {
      const id = path.split("/")[2];
      const inspections2 = await database.select().from(inspections).where(eq(inspections.id, id));
      if (inspections2.length === 0) {
        return errorResponse("Inspecci\xF3n no encontrada", 404);
      }
      const items = await database.select().from(inspectionItems).where(eq(inspectionItems.inspectionId, id));
      const vehicles2 = await database.select().from(vehicles).where(eq(vehicles.id, inspections2[0].vehicleId));
      return jsonResponse({
        ...inspections2[0],
        items,
        vehicle: vehicles2[0] || null
      });
    }
    if (path.match(/^\/inspections\/[^/]+$/) && method === "PUT") {
      const id = path.split("/")[2];
      const updateData = { ...body, updatedAt: /* @__PURE__ */ new Date() };
      const result = await database.update(inspections).set(updateData).where(eq(inspections.id, id)).returning();
      return jsonResponse(result[0]);
    }
    if (path.match(/^\/inspections\/[^/]+$/) && method === "DELETE") {
      const id = path.split("/")[2];
      await database.delete(inspectionItems).where(eq(inspectionItems.inspectionId, id));
      await database.delete(inspections).where(eq(inspections.id, id));
      return jsonResponse({ success: true });
    }
    if (path === "/inspection-items" && method === "POST") {
      const result = await database.insert(inspectionItems).values(body).returning();
      return jsonResponse(result[0], 201);
    }
    if (path.match(/^\/inspection-items\/[^/]+$/) && method === "PUT") {
      const id = path.split("/")[2];
      const result = await database.update(inspectionItems).set({ ...body, updatedAt: /* @__PURE__ */ new Date() }).where(eq(inspectionItems.id, id)).returning();
      return jsonResponse(result[0]);
    }
    return errorResponse("Ruta no encontrada", 404);
  } catch (error) {
    console.error("API Error:", error);
    return errorResponse(error.message || "Error interno del servidor", 500);
  }
};
export {
  handler
};
