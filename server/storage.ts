import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import {
  vehicles, inspections, inspectionItems,
  type Vehicle, type InsertVehicle,
  type Inspection, type InsertInspection,
  type InspectionItem, type InsertInspectionItem,
  type InspectionWithItems,
} from "@shared/schema";

// ─── Vehicles ────────────────────────────────────────────────────────────────

export async function getVehicles(): Promise<Vehicle[]> {
  return db.select().from(vehicles).orderBy(vehicles.name);
}

export async function getVehicleById(id: string): Promise<Vehicle | undefined> {
  const rows = await db.select().from(vehicles).where(eq(vehicles.id, id));
  return rows[0];
}

export async function createVehicle(data: InsertVehicle): Promise<Vehicle> {
  const rows = await db.insert(vehicles).values(data).returning();
  return rows[0];
}

export async function updateVehicle(id: string, data: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
  const rows = await db.update(vehicles).set(data).where(eq(vehicles.id, id)).returning();
  return rows[0];
}

export async function deleteVehicle(id: string): Promise<boolean> {
  const rows = await db.delete(vehicles).where(eq(vehicles.id, id)).returning();
  return rows.length > 0;
}

// ─── Inspections ─────────────────────────────────────────────────────────────

export async function getInspections(): Promise<InspectionWithItems[]> {
  const insp = await db.select().from(inspections).orderBy(desc(inspections.createdAt));
  const result: InspectionWithItems[] = [];
  for (const i of insp) {
    const items = await db.select().from(inspectionItems).where(eq(inspectionItems.inspectionId, i.id));
    result.push({ ...i, items });
  }
  return result;
}

export async function getInspectionById(id: string): Promise<InspectionWithItems | undefined> {
  const rows = await db.select().from(inspections).where(eq(inspections.id, id));
  if (!rows[0]) return undefined;
  const items = await db.select().from(inspectionItems).where(eq(inspectionItems.inspectionId, id));
  return { ...rows[0], items };
}

export async function createInspection(data: InsertInspection, items: Omit<InsertInspectionItem, "inspectionId">[]): Promise<InspectionWithItems> {
  const inspRows = await db.insert(inspections).values(data).returning();
  const insp = inspRows[0];
  const itemsToInsert = items.map(item => ({ ...item, inspectionId: insp.id }));
  const savedItems = await db.insert(inspectionItems).values(itemsToInsert).returning();
  return { ...insp, items: savedItems };
}

export async function updateInspection(id: string, data: Partial<InsertInspection>): Promise<Inspection | undefined> {
  const rows = await db.update(inspections).set(data).where(eq(inspections.id, id)).returning();
  return rows[0];
}

export async function deleteInspection(id: string): Promise<boolean> {
  await db.delete(inspectionItems).where(eq(inspectionItems.inspectionId, id));
  const rows = await db.delete(inspections).where(eq(inspections.id, id)).returning();
  return rows.length > 0;
}

// ─── Inspection Items ─────────────────────────────────────────────────────────

export async function updateInspectionItem(id: string, data: { status?: string; notes?: string }): Promise<InspectionItem | undefined> {
  const rows = await db.update(inspectionItems).set(data).where(eq(inspectionItems.id, id)).returning();
  return rows[0];
}
