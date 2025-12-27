-- Función para crear usuarios desde el panel de administración
-- Esta función debe ejecutarse en Supabase SQL Editor
-- Requiere permisos de administrador

-- Función para crear usuario con rol específico
CREATE OR REPLACE FUNCTION public.create_user_with_role(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_role user_role DEFAULT 'user'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_auth_user_id UUID;
BEGIN
  -- Verificar que el usuario que llama sea admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo los administradores pueden crear usuarios';
  END IF;

  -- Crear usuario en auth.users usando la extensión auth
  -- Nota: Esto requiere permisos especiales de Supabase
  -- En producción, deberías usar Supabase Management API o Edge Functions
  
  -- Por ahora, retornamos un error indicando que se debe usar otro método
  RAISE EXCEPTION 'Use Supabase Management API o Edge Functions para crear usuarios. Esta función SQL no puede crear usuarios en auth.users directamente.';
  
  RETURN v_user_id;
END;
$$;

-- Nota: Para crear usuarios programáticamente desde el cliente,
-- necesitas usar una de estas opciones:
-- 1. Supabase Management API (requiere service role key en servidor)
-- 2. Supabase Edge Function con permisos de admin
-- 3. Invitación por email usando supabase.auth.admin.inviteUserByEmail()

