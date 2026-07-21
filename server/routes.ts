import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import * as storage from "./storage";
import { insertVehicleSchema, insertInspectionSchema } from "@shared/schema";
import { getUserByUsername, verifyPassword } from "./auth";
import { generateInspectionPdf, buildInspectionFileName } from "./pdf-generator";
import { backupInspectionPdf, isDriveBackupEnabled } from "./drive-backup";

declare module "express-session" {
  interface SessionData {
    userId: string;
    username: string;
  }
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) return next();
  res.status(401).json({ error: "No autorizado" });
}

// ── Default inspection items ──────────────────────────────────────────────────
const DEFAULT_ITEMS = [
  { name: "Luces delanteras", category: "technical" as const, sortOrder: "1" },
  { name: "Luces traseras", category: "technical" as const, sortOrder: "2" },
  { name: "Luces de freno", category: "technical" as const, sortOrder: "3" },
  { name: "Luces intermitentes", category: "technical" as const, sortOrder: "4" },
  { name: "Alarma de reversa", category: "technical" as const, sortOrder: "5" },
  { name: "Estado de las llantas", category: "technical" as const, sortOrder: "6" },
  { name: "Estado de fugas en general", category: "technical" as const, sortOrder: "7" },
  { name: "Estado de los mandos hidráulicos (Compactadores)", category: "technical" as const, sortOrder: "8" },
  { name: "Nivel de combustible", category: "technical" as const, sortOrder: "9" },
  { name: "Nivel de aceite hidráulico", category: "technical" as const, sortOrder: "10" },
  { name: "Nivel de aceite motor", category: "technical" as const, sortOrder: "11" },
  { name: "Nivel de refrigerante", category: "technical" as const, sortOrder: "12" },
  { name: "Nivel de líquido de frenos", category: "technical" as const, sortOrder: "13" },
  { name: "Nivel de líquido limpiaparabrisas", category: "technical" as const, sortOrder: "14" },
  { name: "Frenos", category: "technical" as const, sortOrder: "15" },
  { name: "Cinturones de seguridad", category: "technical" as const, sortOrder: "16" },
  { name: "Bocina", category: "technical" as const, sortOrder: "17" },
  { name: "Limpiaparabrisas", category: "technical" as const, sortOrder: "18" },
  { name: "Espejos", category: "technical" as const, sortOrder: "19" },
  { name: "Llanta de repuesto", category: "technical" as const, sortOrder: "20" },
  { name: "Caja de herramientas básicas", category: "technical" as const, sortOrder: "21" },
  { name: "Botiquín", category: "safety" as const, sortOrder: "22" },
  { name: "Guantes anticorte", category: "safety" as const, sortOrder: "23" },
  { name: "Conos de seguridad", category: "safety" as const, sortOrder: "24" },
  { name: "Extintor", category: "safety" as const, sortOrder: "25" },
  { name: "Linterna", category: "safety" as const, sortOrder: "26" },
  { name: "SOAT vigente", category: "legal" as const, sortOrder: "27" },
  { name: "RTM vigente", category: "legal" as const, sortOrder: "28" },
  { name: "Licencia de conducir vigente", category: "legal" as const, sortOrder: "29" },
  { name: "Tarjeta de propiedad", category: "legal" as const, sortOrder: "30" },
];

export async function registerRoutes(app: Express): Promise<Server> {
  // ── Auth routes (public) ───────────────────────────────────────────────────
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: "Faltan credenciales" });
      const user = await getUserByUsername(username);
      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ id: user.id, username: user.username });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: "No autorizado" });
    res.json({ id: req.session.userId, username: req.session.username });
  });

  // ── All routes below require auth ─────────────────────────────────────────
  app.use("/api/vehicles", requireAuth);
  app.use("/api/inspections", requireAuth);
  app.use("/api/inspection-items", requireAuth);

  // ── Vehicles ───────────────────────────────────────────────────────────────
  app.get("/api/vehicles", async (_req, res) => {
    try { res.json(await storage.getVehicles()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/vehicles/:id", async (req, res) => {
    try {
      const v = await storage.getVehicleById(req.params.id);
      if (!v) return res.status(404).json({ error: "Vehículo no encontrado" });
      res.json(v);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/vehicles", async (req, res) => {
    try {
      const data = insertVehicleSchema.parse(req.body);
      res.status(201).json(await storage.createVehicle(data));
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/vehicles/:id", async (req, res) => {
    try {
      const data = insertVehicleSchema.partial().parse(req.body);
      const v = await storage.updateVehicle(req.params.id, data);
      if (!v) return res.status(404).json({ error: "Vehículo no encontrado" });
      res.json(v);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    try {
      const ok = await storage.deleteVehicle(req.params.id);
      if (!ok) return res.status(404).json({ error: "Vehículo no encontrado" });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Inspections ────────────────────────────────────────────────────────────
  app.get("/api/inspections", async (_req, res) => {
    try { res.json(await storage.getInspections()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/inspections/:id", async (req, res) => {
    try {
      const insp = await storage.getInspectionById(req.params.id);
      if (!insp) return res.status(404).json({ error: "Inspección no encontrada" });
      res.json(insp);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/inspections", async (req, res) => {
    try {
      const data = insertInspectionSchema.parse(req.body);
      const items = DEFAULT_ITEMS.map(item => ({ ...item, status: "not-checked" as const, notes: null }));
      res.status(201).json(await storage.createInspection(data, items));
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/inspections/:id", async (req, res) => {
    try {
      const schema = insertInspectionSchema.partial();
      const data = schema.parse(req.body);
      const wasJustCompleted = data.completed === true;
      const insp = await storage.updateInspection(req.params.id, data);
      if (!insp) return res.status(404).json({ error: "Inspección no encontrada" });
      res.json(insp);

      // Fire-and-forget backup to Google Drive when an inspection is completed.
      // Failures are logged but never affect the API response.
      if (wasJustCompleted && isDriveBackupEnabled()) {
        void (async () => {
          try {
            const full = await storage.getInspectionById(insp.id);
            if (!full) return;
            const vehicle = await storage.getVehicleById(full.vehicleId);
            const pdf = generateInspectionPdf(full, vehicle);
            const fileName = buildInspectionFileName(full, vehicle);
            await backupInspectionPdf(pdf, fileName, full.date);
          } catch (err) {
            console.error("[Backup] Error al respaldar inspección en Drive:", err);
          }
        })();
      }
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/inspections/:id", async (req, res) => {
    try {
      const ok = await storage.deleteInspection(req.params.id);
      if (!ok) return res.status(404).json({ error: "Inspección no encontrada" });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Inspection Items ───────────────────────────────────────────────────────
  app.put("/api/inspection-items/:id", async (req, res) => {
    try {
      const schema = z.object({
        status: z.enum(["pass", "fail", "not-checked", "n/a"]).optional(),
        notes: z.string().nullable().optional(),
      });
      const data = schema.parse(req.body);
      const item = await storage.updateInspectionItem(req.params.id, data);
      if (!item) return res.status(404).json({ error: "Ítem no encontrado" });
      res.json(item);
    } catch (e: any) {
      if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
      res.status(500).json({ error: e.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
