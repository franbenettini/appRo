-- Migración para crear tabla de productos
-- Ejecutar este script en Supabase SQL Editor

-- 1. Tabla de productos
CREATE TABLE IF NOT EXISTS public.productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  nombre_equipo TEXT NOT NULL,
  rubro TEXT NOT NULL, -- laboratorio, imagenes, etc
  descripcion TEXT,
  imagen_url TEXT, -- URL de la imagen en Supabase Storage
  especificaciones_pdf_url TEXT, -- URL del PDF de especificaciones técnicas en Supabase Storage
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_productos_created_by ON public.productos(created_by);
CREATE INDEX IF NOT EXISTS idx_productos_rubro ON public.productos(rubro);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON public.productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_marca ON public.productos(marca);

-- 3. Trigger para updated_at
DROP TRIGGER IF EXISTS update_productos_updated_at ON public.productos;
CREATE TRIGGER update_productos_updated_at
  BEFORE UPDATE ON public.productos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Habilitar RLS
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- 5. Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Admins can view all products" ON public.productos;
DROP POLICY IF EXISTS "Admins can insert products" ON public.productos;
DROP POLICY IF EXISTS "Admins can update products" ON public.productos;
DROP POLICY IF EXISTS "Admins can delete products" ON public.productos;
DROP POLICY IF EXISTS "Users can view active products" ON public.productos;

-- 6. Políticas RLS
-- Solo admins pueden ver todos los productos
CREATE POLICY "Admins can view all products"
  ON public.productos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Solo admins pueden insertar productos
CREATE POLICY "Admins can insert products"
  ON public.productos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Solo admins pueden actualizar productos
CREATE POLICY "Admins can update products"
  ON public.productos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Solo admins pueden eliminar productos
CREATE POLICY "Admins can delete products"
  ON public.productos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Todos los usuarios pueden ver productos activos (para enlazarlos con oportunidades)
CREATE POLICY "Users can view active products"
  ON public.productos
  FOR SELECT
  USING (activo = true);

