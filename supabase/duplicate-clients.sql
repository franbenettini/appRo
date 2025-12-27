-- Script para cuadruplicar los clientes existentes (duplicar 3 veces)
-- Ejecutar este script en Supabase SQL Editor
-- ADVERTENCIA: Esto creará copias de todos los clientes y sus contactos

-- Función para duplicar clientes
DO $$
DECLARE
    client_record RECORD;
    new_client_id UUID;
    contact_record RECORD;
    counter INTEGER := 0;
BEGIN
    -- Obtener todos los clientes
    FOR client_record IN 
        SELECT * FROM public.clients
    LOOP
        -- Duplicar el cliente 3 veces (para tener 4 en total)
        FOR i IN 1..3 LOOP
            -- Insertar nuevo cliente con datos duplicados
            INSERT INTO public.clients (
                razon_social,
                nombre_establecimiento,
                tipo_establecimiento,
                cuit,
                direccion,
                localidad,
                provincia,
                direccion_lat,
                direccion_lng,
                status,
                created_by,
                created_at,
                updated_at
            )
            VALUES (
                client_record.razon_social,
                client_record.nombre_establecimiento,
                client_record.tipo_establecimiento,
                client_record.cuit,
                client_record.direccion,
                client_record.localidad,
                client_record.provincia,
                client_record.direccion_lat,
                client_record.direccion_lng,
                client_record.status,
                client_record.created_by,
                NOW(),
                NOW()
            )
            RETURNING id INTO new_client_id;
            
            -- Duplicar todos los contactos del cliente original
            FOR contact_record IN
                SELECT * FROM public.client_contacts
                WHERE client_id = client_record.id
            LOOP
                INSERT INTO public.client_contacts (
                    client_id,
                    nombre,
                    tipo_contacto,
                    email,
                    telefono,
                    created_at,
                    updated_at
                )
                VALUES (
                    new_client_id,
                    contact_record.nombre,
                    contact_record.tipo_contacto,
                    contact_record.email,
                    contact_record.telefono,
                    NOW(),
                    NOW()
                );
            END LOOP;
            
            counter := counter + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Se duplicaron % clientes (3 veces cada uno)', counter;
END $$;

-- Verificar el resultado
SELECT 
    COUNT(*) as total_clientes,
    COUNT(DISTINCT created_by) as usuarios_con_clientes
FROM public.clients;

