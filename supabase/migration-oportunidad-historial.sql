-- Migración para crear tabla de historial de cambios de estado en oportunidades
-- Ejecutar este script en Supabase SQL Editor

-- 1. Tabla de historial de oportunidades
CREATE TABLE IF NOT EXISTS public.oportunidad_historial (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oportunidad_id UUID NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  comentario TEXT,
  changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_oportunidad_historial_oportunidad_id ON public.oportunidad_historial(oportunidad_id);
CREATE INDEX IF NOT EXISTS idx_oportunidad_historial_changed_by ON public.oportunidad_historial(changed_by);
CREATE INDEX IF NOT EXISTS idx_oportunidad_historial_created_at ON public.oportunidad_historial(created_at DESC);

-- 3. Habilitar RLS
ALTER TABLE public.oportunidad_historial ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para historial
-- Los usuarios pueden ver el historial de oportunidades que pueden ver
CREATE POLICY "Users can view oportunidad historial"
  ON public.oportunidad_historial FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.oportunidades
      WHERE oportunidades.id = oportunidad_historial.oportunidad_id
      AND (
        oportunidades.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
        )
      )
    )
  );

-- Los usuarios pueden crear entradas de historial cuando cambian el estado
CREATE POLICY "Users can create oportunidad historial"
  ON public.oportunidad_historial FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.oportunidades
      WHERE oportunidades.id = oportunidad_historial.oportunidad_id
      AND (
        oportunidades.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role = 'admin'
        )
      )
    )
    AND changed_by = auth.uid()
  );

