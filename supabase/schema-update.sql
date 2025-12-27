-- Actualizar tabla de clientes con nuevos campos
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS razon_social TEXT,
  ADD COLUMN IF NOT EXISTS nombre_establecimiento TEXT,
  ADD COLUMN IF NOT EXISTS cuit TEXT,
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS direccion_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS direccion_lng DECIMAL(11, 8);

-- Actualizar la columna name para que sea opcional si tenemos razón social
ALTER TABLE public.clients 
  ALTER COLUMN name DROP NOT NULL;

-- Crear tabla de contactos de clientes
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tipo_contacto TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para contactos
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON public.client_contacts(client_id);

-- Trigger para updated_at en contactos
CREATE TRIGGER update_client_contacts_updated_at
  BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS para contactos
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- Políticas para contactos
CREATE POLICY "Users can view all client contacts"
  ON public.client_contacts FOR SELECT
  USING (true);

CREATE POLICY "Users can create client contacts"
  ON public.client_contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own client contacts"
  ON public.client_contacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own client contacts"
  ON public.client_contacts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = client_id AND created_by = auth.uid()
    )
  );

