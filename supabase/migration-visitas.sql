-- Migración para crear tablas de rutas y visitas
-- Ejecutar este script en Supabase SQL Editor

-- 1. Tabla de rutas (viajes)
CREATE TABLE IF NOT EXISTS public.rutas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  fecha DATE NOT NULL,
  descripcion TEXT,
  fecha_finalizacion DATE,
  estado TEXT NOT NULL DEFAULT 'planificada', -- planificada, finalizada
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de clientes en rutas (muchos a muchos)
CREATE TABLE IF NOT EXISTS public.ruta_clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ruta_id UUID NOT NULL REFERENCES public.rutas(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  orden INTEGER DEFAULT 0, -- Orden de visita en la ruta
  visitado BOOLEAN NOT NULL DEFAULT false,
  fecha_visita TIMESTAMPTZ,
  oportunidad_venta TEXT,
  estado_cliente TEXT, -- Estado o paso con el cliente
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ruta_id, client_id)
);

-- 3. Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_rutas_created_by ON public.rutas(created_by);
CREATE INDEX IF NOT EXISTS idx_rutas_fecha ON public.rutas(fecha);
CREATE INDEX IF NOT EXISTS idx_ruta_clientes_ruta_id ON public.ruta_clientes(ruta_id);
CREATE INDEX IF NOT EXISTS idx_ruta_clientes_client_id ON public.ruta_clientes(client_id);

-- 4. Trigger para updated_at en rutas
CREATE TRIGGER update_rutas_updated_at
  BEFORE UPDATE ON public.rutas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Trigger para updated_at en ruta_clientes
CREATE TRIGGER update_ruta_clientes_updated_at
  BEFORE UPDATE ON public.ruta_clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Habilitar RLS
ALTER TABLE public.rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruta_clientes ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS para rutas
CREATE POLICY "Users can view own rutas"
  ON public.rutas FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create own rutas"
  ON public.rutas FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own rutas"
  ON public.rutas FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own rutas"
  ON public.rutas FOR DELETE
  USING (created_by = auth.uid());

-- 8. Políticas RLS para ruta_clientes
CREATE POLICY "Users can view own ruta_clientes"
  ON public.ruta_clientes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rutas
      WHERE id = ruta_clientes.ruta_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create own ruta_clientes"
  ON public.ruta_clientes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rutas
      WHERE id = ruta_clientes.ruta_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own ruta_clientes"
  ON public.ruta_clientes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rutas
      WHERE id = ruta_clientes.ruta_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own ruta_clientes"
  ON public.ruta_clientes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.rutas
      WHERE id = ruta_clientes.ruta_id AND created_by = auth.uid()
    )
  );

