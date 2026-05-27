/*
  # Añadir tabla de sesiones para Netlify

  1. Tablas Nuevas
    - `sessions`: Tokens de sesión para autenticación sin cookies

  2. Seguridad (RLS)
    - RLS habilitado
    - Solo usuarios autenticados pueden ver sus propias sesiones

  3. Notas
    - Tokens con expiración opcional
    - Relación con usuario propietario
*/

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can delete sessions"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);