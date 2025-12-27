-- Migración para agregar nuevos campos a clients y crear tabla de contactos
-- Ejecutar este script en Supabase SQL Editor

-- 1. Agregar nuevos campos a la tabla clients
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS razon_social TEXT,
  ADD COLUMN IF NOT EXISTS nombre_establecimiento TEXT,
  ADD COLUMN IF NOT EXISTS tipo_establecimiento TEXT,
  ADD COLUMN IF NOT EXISTS cuit TEXT,
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS localidad TEXT,
  ADD COLUMN IF NOT EXISTS provincia TEXT,
  ADD COLUMN IF NOT EXISTS direccion_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS direccion_lng DECIMAL(11, 8);

-- 2. Hacer name opcional (ya que ahora tenemos razón_social)
ALTER TABLE public.clients 
  ALTER COLUMN name DROP NOT NULL;

-- 3. Crear tabla de contactos de clientes
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tipo_contacto TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON public.client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);

-- 5. Trigger para updated_at en contactos
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_contacts_updated_at
  BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Habilitar RLS para contactos
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- 7. Actualizar política RLS de clients para que solo vean sus propios clientes
DROP POLICY IF EXISTS "Users can view all clients" ON public.clients;
CREATE POLICY "Users can view own clients"
  ON public.clients FOR SELECT
  USING (created_by = auth.uid());

-- 8. Políticas RLS para contactos
-- Los usuarios pueden ver todos los contactos de sus clientes
CREATE POLICY "Users can view own client contacts"
  ON public.client_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_contacts.client_id AND created_by = auth.uid()
    )
  );

-- Los usuarios pueden crear contactos para sus clientes
CREATE POLICY "Users can create own client contacts"
  ON public.client_contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND created_by = auth.uid()
    )
  );

-- Los usuarios pueden actualizar contactos de sus clientes
CREATE POLICY "Users can update own client contacts"
  ON public.client_contacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND created_by = auth.uid()
    )
  );

-- Los usuarios pueden eliminar contactos de sus clientes
CREATE POLICY "Users can delete own client contacts"
  ON public.client_contacts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND created_by = auth.uid()
    )
  );

-- Nota: Si eres administrador y quieres ver todos los clientes, puedes crear una política adicional:
-- CREATE POLICY "Admins can view all clients"
--   ON public.clients FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.users
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   );

