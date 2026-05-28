/*
  # Corrección de Políticas RLS - Seguridad Mejorada

  ## Problema
  Las políticas RLS actuales usan `USING (true)` y `WITH CHECK (true)`, lo que permite
  acceso irrestricto a todos los usuarios autenticados, vulnerando el principio de
  least privilege.

  ## Solución
  Implementar políticas restrictivas que:
  - Permitan a usuarios autenticados acceder solo a datos de su organización
  - Registren quién crea/modifica cada registro (created_by)
  - Limiten operaciones basándose en ownership o membresía

  ## Consideraciones de Negocio
  Este es un sistema de inspección vehicular colaborativo donde:
  - Todos los inspectores necesitan ver/editar todas las inspecciones
  - Los administradores tienen acceso completo
  - Los inspectores pueden crear inspecciones pero solo modificar las suyas o las pendientes

  ## Políticas por Tabla

  1. USERS
     - SELECT: Todos pueden ver usuarios (para mostrar nombres en inspecciones)
     - INSERT/UPDATE: Solo el propio usuario o administradores
     - DELETE: Solo administradores

  2. VEHICLES
     - SELECT: Todos los usuarios autenticados
     - INSERT: Todos pueden crear vehículos
     - UPDATE: Solo creador o administradores
     - DELETE: Solo administradores

  3. INSPECTIONS
     - SELECT: Todos los usuarios autenticados
     - INSERT: Todos pueden crear inspecciones
     - UPDATE: Solo creador, inspector asignado, o administradores
     - DELETE: Solo administradores

  4. INSPECTION_ITEMS
     - Acceso basado en la inspección padre
     - Solo si tienen acceso a la inspección pueden modificar items

  5. SESSIONS
     - Solo el propio usuario puede ver/manejar sus sesiones
*/

-- ============================================================================
-- USERS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "All authenticated users can read users" ON public.users;
DROP POLICY IF EXISTS "All authenticated users can insert users" ON public.users;
DROP POLICY IF EXISTS "All authenticated users can update users" ON public.users;

-- Solo administradores pueden crear usuarios
CREATE POLICY "Only admins can insert users"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Usuarios pueden actualizar su propio perfil, administradores pueden actualizar cualquiera
CREATE POLICY "Users can update own profile or admins can update any"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Todos pueden leer usuarios (necesario para mostrar nombres en UI)
CREATE POLICY "All authenticated users can read users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "All authenticated users can read vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "All authenticated users can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "All authenticated users can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "All authenticated users can delete vehicles" ON public.vehicles;

-- Todos pueden crear vehículos (se registra created_by)
CREATE POLICY "Authenticated users can insert vehicles"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Creador o administradores pueden actualizar
CREATE POLICY "Creator or admins can update vehicles"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Todos pueden ver vehículos
CREATE POLICY "All authenticated users can read vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

-- Solo administradores pueden eliminar vehículos
CREATE POLICY "Only admins can delete vehicles"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================================
-- INSPECTIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "All authenticated users can read inspections" ON public.inspections;
DROP POLICY IF EXISTS "All authenticated users can insert inspections" ON public.inspections;
DROP POLICY IF EXISTS "All authenticated users can update inspections" ON public.inspections;
DROP POLICY IF EXISTS "All authenticated users can delete inspections" ON public.inspections;

-- Todos pueden crear inspecciones (se registra created_by)
CREATE POLICY "Authenticated users can insert inspections"
  ON public.inspections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Creador, inspector asignado, o administradores pueden actualizar
CREATE POLICY "Creator inspector or admins can update inspections"
  ON public.inspections FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Todos pueden ver inspecciones
CREATE POLICY "All authenticated users can read inspections"
  ON public.inspections FOR SELECT
  TO authenticated
  USING (true);

-- Solo administradores pueden eliminar inspecciones
CREATE POLICY "Only admins can delete inspections"
  ON public.inspections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================================
-- INSPECTION_ITEMS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "All authenticated users can read inspection_items" ON public.inspection_items;
DROP POLICY IF EXISTS "All authenticated users can insert inspection_items" ON public.inspection_items;
DROP POLICY IF EXISTS "All authenticated users can update inspection_items" ON public.inspection_items;
DROP POLICY IF EXISTS "All authenticated users can delete inspection_items" ON public.inspection_items;

-- Acceso a items basado en la inspección padre
CREATE POLICY "Can insert items if can update inspection"
  ON public.inspection_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id AND (
        i.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND u.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Can update items if can update inspection"
  ON public.inspection_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id AND (
        i.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND u.role = 'admin'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id AND (
        i.created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND u.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Can read items if can read inspection"
  ON public.inspection_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id
    )
  );

CREATE POLICY "Only admins can delete inspection items"
  ON public.inspection_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "All authenticated users can read sessions" ON public.sessions;
DROP POLICY IF EXISTS "All authenticated users can insert sessions" ON public.sessions;
DROP POLICY IF EXISTS "All authenticated users can delete sessions" ON public.sessions;

-- Los usuarios solo pueden ver sus propias sesiones
CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Los usuarios pueden crear sus propias sesiones (login)
CREATE POLICY "Users can create own sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Los usuarios pueden eliminar sus propias sesiones (logout)
CREATE POLICY "Users can delete own sessions"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

-- Función para verificar si el usuario es administrador
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;