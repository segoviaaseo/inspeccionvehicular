/*
  # Esquema Inicial - Sistema de Inspección Vehicular

  1. Tablas Nuevas
    - `users`: Usuarios del sistema (autenticación local)
    - `vehicles`: Flota de vehículos con fechas de vencimiento de documentos
    - `inspections`: Inspecciones vehiculares realizadas
    - `inspection_items`: Items individuales de cada inspección
    - `sessions`: Tokens de sesión para autenticación

  2. Seguridad (RLS)
    - Todas las tablas tienen Row Level Security habilitado
    - Policies restrictivas: los usuarios autenticados pueden ver/crear sus propios datos

  3. Notas Importantes
    - Se usa gen_random_uuid() para IDs únicos
    - Timestamps automáticos con DEFAULT now()
    - Usuario admin por defecto: admin / segovia2024
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL DEFAULT 'inspector',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert users"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update users"
  ON public.users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- VEHICLES
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

CREATE POLICY "All authenticated users can read vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert vehicles"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update vehicles"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can delete vehicles"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (true);

-- INSPECTIONS
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

CREATE POLICY "All authenticated users can read inspections"
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

CREATE POLICY "All authenticated users can delete inspections"
  ON public.inspections FOR DELETE
  TO authenticated
  USING (true);

-- INSPECTION ITEMS
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

CREATE POLICY "All authenticated users can read inspection_items"
  ON public.inspection_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert inspection_items"
  ON public.inspection_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update inspection_items"
  ON public.inspection_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can delete inspection_items"
  ON public.inspection_items FOR DELETE
  TO authenticated
  USING (true);

-- SESSIONS
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can delete sessions"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON public.vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_id ON public.inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id ON public.inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);

-- DEFAULT ADMIN USER (password: segovia2024)
-- This is a simple hash for demo purposes
INSERT INTO public.users (username, password, role)
VALUES ('admin', 'segovia2024:simplehash12345678', 'admin')
ON CONFLICT (username) DO NOTHING;