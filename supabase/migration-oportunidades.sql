-- Migración para crear tabla de oportunidades de venta
-- Ejecutar este script en Supabase SQL Editor

-- 1. Tabla de oportunidades
CREATE TABLE IF NOT EXISTS public.oportunidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  valor_estimado DECIMAL(12, 2),
  probabilidad INTEGER DEFAULT 50, -- 0-100 porcentaje
  estado TEXT NOT NULL DEFAULT 'nueva', -- nueva, en_seguimiento, ganada, perdida, cerrada
  fecha_cierre_estimada DATE,
  notas TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_oportunidades_client_id ON public.oportunidades(client_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_created_by ON public.oportunidades(created_by);
CREATE INDEX IF NOT EXISTS idx_oportunidades_estado ON public.oportunidades(estado);
CREATE INDEX IF NOT EXISTS idx_oportunidades_fecha_cierre ON public.oportunidades(fecha_cierre_estimada);

-- 3. Trigger para updated_at
CREATE TRIGGER update_oportunidades_updated_at
  BEFORE UPDATE ON public.oportunidades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Habilitar RLS
ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para oportunidades
CREATE POLICY "Users can view own oportunidades"
  ON public.oportunidades FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create own oportunidades"
  ON public.oportunidades FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own oportunidades"
  ON public.oportunidades FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own oportunidades"
  ON public.oportunidades FOR DELETE
  USING (created_by = auth.uid());

