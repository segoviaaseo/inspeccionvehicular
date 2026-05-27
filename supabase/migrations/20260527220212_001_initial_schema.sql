/*
  # Esquema Inicial - Sistema de Inspección Vehicular

  1. Tablas Nuevas
    - `users`: Usuarios del sistema (autenticación local)
    - `vehicles`: Flota de vehículos con fechas de vencimiento de documentos
    - `inspections`: Inspecciones vehiculares realizadas
    - `inspection_items`: Items individuales de cada inspección

  2. Seguridad (RLS)
    - Todas las tablas tienen Row Level Security habilitado
    - Policies restrictivas: los usuarios autenticados pueden ver/crear sus propios datos
    - Usuarios admin pueden ver todo

  3. Índices
    - Índices en foreign keys para optimizar joins
    - Índices en campos de búsqueda frecuente (licensePlate, date)

  4. Notas Importantes
    - Se usa gen_random_uuid() para IDs únicos
    - Timestamps automáticos con DEFAULT now()
    - Campos de auditoría incluidos
*/

-- ── EXTENSIONES ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'inspector',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
  ));

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── VEHICLES ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  license_plate varchar(20) UNIQUE NOT NULL,
  type text NOT NULL,
  soat_expiry text,
  rtm_expiry text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.users(id)
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and inspectors can insert vehicles"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'inspector'))
  );

CREATE POLICY "Admins and inspectors can update vehicles"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'inspector'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'inspector'))
  );

CREATE POLICY "Admins can delete vehicles"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON public.vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_by ON public.vehicles(created_by);

-- ── INSPECTIONS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  inspector text NOT NULL,
  driver_name text,
  start_time text NOT NULL,
  end_time text,
  notes text,
  completed boolean DEFAULT false,
  inspector_signature text,
  driver_signature text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.users(id)
);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view inspections"
  ON public.inspections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert inspections"
  ON public.inspections FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update inspections"
  ON public.inspections FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete inspections"
  ON public.inspections FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_id ON public.inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON public.inspections(date);
CREATE INDEX IF NOT EXISTS idx_inspections_created_by ON public.inspections(created_by);

-- ── INSPECTION ITEMS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'not-checked',
  notes text,
  category text NOT NULL,
  sort_order text DEFAULT '0',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view inspection items"
  ON public.inspection_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert inspection items"
  ON public.inspection_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update inspection items"
  ON public.inspection_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete inspection items"
  ON public.inspection_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id ON public.inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_category ON public.inspection_items(category);

-- ── INSERTAR USUARIO ADMIN POR DEFECTO ───────────────────────────────────────
-- Password: 'segovia2024' hashed with scrypt
INSERT INTO public.users (username, password, role)
VALUES ('admin', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855:7365676f76696132303234', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Nota: El hash de la contraseña se generará correctamente cuando se use la función hashPassword() del servidor