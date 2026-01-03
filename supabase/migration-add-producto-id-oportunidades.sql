-- Migración para agregar columna producto_id a la tabla oportunidades
-- Ejecutar este script en Supabase SQL Editor

-- Agregar columna producto_id a oportunidades
ALTER TABLE public.oportunidades
ADD COLUMN IF NOT EXISTS producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL;

-- Crear índice para mejorar performance en búsquedas por producto
CREATE INDEX IF NOT EXISTS idx_oportunidades_producto_id ON public.oportunidades(producto_id);

