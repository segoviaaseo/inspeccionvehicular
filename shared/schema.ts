import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  licensePlate: varchar("license_plate", { length: 20 }).notNull().unique(),
  type: text("type").notNull(),
  soatExpiry: text("soat_expiry"),
  rtmExpiry: text("rtm_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inspections = pgTable("inspections", {
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
});

export const inspectionItems = pgTable("inspection_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectionId: varchar("inspection_id").notNull(),
  name: text("name").notNull(),
  status: text("status", { enum: ["pass", "fail", "not-checked", "n/a"] }).notNull().default("not-checked"),
  notes: text("notes"),
  category: text("category", { enum: ["technical", "safety", "legal"] }).notNull(),
  sortOrder: text("sort_order").default("0"),
});

export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export const insertInspectionSchema = createInsertSchema(inspections).omit({ id: true, createdAt: true });
export const insertInspectionItemSchema = createInsertSchema(inspectionItems).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type InspectionItem = typeof inspectionItems.$inferSelect;
export type InsertInspectionItem = z.infer<typeof insertInspectionItemSchema>;

export type InspectionWithItems = Inspection & {
  items: InspectionItem[];
  vehicle?: Vehicle;
};
