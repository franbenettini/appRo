import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function PUT(request: NextRequest) {
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
        { error: "No autorizado. Solo los administradores pueden actualizar usuarios." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, email, password, full_name, role } = body

    if (!userId || !email || !full_name) {
      return NextResponse.json(
        { error: "userId, email y full_name son requeridos" },
        { status: 400 }
      )
    }

    // Crear cliente con service role key para actualizar
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

    // Actualizar email en auth.users si cambió
    const { data: currentUser } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (currentUser?.user && currentUser.user.email !== email) {
      const { error: updateEmailError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email,
      })

      if (updateEmailError) {
        return NextResponse.json(
          { error: updateEmailError.message || "Error al actualizar el email" },
          { status: 400 }
        )
      }
    }

    // Actualizar contraseña si se proporcionó
    if (password && password.length >= 6) {
      const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
      })

      if (updatePasswordError) {
        return NextResponse.json(
          { error: updatePasswordError.message || "Error al actualizar la contraseña" },
          { status: 400 }
        )
      }
    }

    // Actualizar datos en la tabla users
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        email,
        full_name,
        role: role || "user",
      })
      .eq("id", userId)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Error al actualizar los datos del usuario" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Usuario actualizado exitosamente"
    })
  } catch (error: any) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: error.message || "Error al actualizar usuario" },
      { status: 500 }
    )
  }
}

