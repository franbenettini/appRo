import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar que el usuario esté autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      )
    }

    // Verificar que el usuario sea admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (userError || userData?.role !== "admin") {
      return NextResponse.json(
        { error: "No autorizado. Solo los administradores pueden crear usuarios." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, password, full_name, role } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      )
    }

    if (!full_name || full_name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre completo es requerido" },
        { status: 400 }
      )
    }

    // Crear usuario usando Supabase Admin API con service role key
    // Necesitas configurar SUPABASE_SERVICE_ROLE_KEY en tus variables de entorno
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Configuración del servidor incompleta. Contacta al administrador." },
        { status: 500 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "Configuración del servidor incompleta." },
        { status: 500 }
      )
    }

    const supabaseAdmin = createServiceClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Crear usuario en auth.users
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
          full_name: full_name,
      },
    })

    if (createError || !authData.user) {
      return NextResponse.json(
        { error: createError?.message || "Error al crear el usuario en el sistema de autenticación" },
        { status: 400 }
      )
    }

    // Actualizar el rol del usuario en la tabla users
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ role: role || "user" })
      .eq("id", authData.user.id)

    if (updateError) {
      console.error("Error updating user role:", updateError)
      // El usuario se creó pero no se pudo actualizar el rol
      // Intentar actualizar manualmente
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      }
    })
  } catch (error: any) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: error.message || "Error al crear usuario" },
      { status: 500 }
    )
  }
}

