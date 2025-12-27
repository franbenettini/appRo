"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Image from "next/image"
import { Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Array de imágenes disponibles para el login
const loginImages = [
  "/portada.png",
  "/Encor.jpg",
  "/bomba bayer.jpg",
  // "/portada-3.png",
  // "/portada-4.png",
]

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Seleccionar una imagen aleatoria al cargar el componente
  const randomImage = useMemo(() => {
    if (loginImages.length === 0) return "/portada.png"
    const randomIndex = Math.floor(Math.random() * loginImages.length)
    return loginImages[randomIndex]
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const translateError = (errorMessage: string): string => {
    const errorMessages: Record<string, string> = {
      "invalid login credentials": "Credenciales de inicio de sesión inválidas",
      "email not confirmed": "Email no confirmado",
      "user not found": "Usuario no encontrado",
      "invalid password": "Contraseña inválida",
      "too many requests": "Demasiados intentos. Por favor, intenta más tarde",
      "network request failed": "Error de conexión. Verifica tu internet",
      "invalid email": "Email inválido",
      "email rate limit exceeded": "Demasiados intentos. Por favor, espera un momento",
      "signup disabled": "El registro está deshabilitado",
      "email already registered": "Este email ya está registrado",
      "weak password": "La contraseña es muy débil",
      "password does not match": "Las contraseñas no coinciden",
      "session expired": "Tu sesión ha expirado. Por favor, inicia sesión nuevamente",
      "invalid token": "Token inválido. Por favor, inicia sesión nuevamente",
      "token expired": "Token expirado. Por favor, inicia sesión nuevamente",
    }

    const lowerMessage = errorMessage.toLowerCase()

    // Buscar coincidencia exacta o parcial
    for (const [key, value] of Object.entries(errorMessages)) {
      if (lowerMessage.includes(key)) {
        return value
      }
    }

    // Si no hay traducción, devolver un mensaje genérico en español
    return "Error al iniciar sesión. Verifica tus credenciales e intenta nuevamente"
  }

  const onSubmit = async (data: LoginFormValues) => {
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        setError(translateError(error.message))
        setLoading(false)
        return
      }

      // Reemplazar la entrada del historial para evitar volver atrás
      window.history.replaceState(null, "", "/dashboard")
      router.replace("/dashboard")
    } catch (err) {
      setError("Ocurrió un error inesperado")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Lado izquierdo - Formulario */}
      <div className="flex-1 flex flex-col justify-center bg-gray-50 px-4 sm:px-6 lg:px-12 py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <div className="relative h-16 w-auto sm:h-20 mb-6">
              <Image
                src="/logo.jpeg"
                alt="Logo de la empresa"
                width={200}
                height={80}
                priority
                className="h-full w-auto object-contain [filter:brightness(1.05)_contrast(1.15)_saturate(1.1)] [mix-blend-mode:multiply] dark:[filter:brightness(0.95)_contrast(1.1)] dark:[mix-blend-mode:screen]"
              />
            </div>
          </div>

          {/* Mensaje de bienvenida */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Bienvenido de vuelta
            </h1>
            <p className="text-muted-foreground">
              Inicia sesión en tu cuenta
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                {...register("email")}
                disabled={loading}
                className="h-11"
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
                  disabled={loading}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-medium" 
              disabled={loading}
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </form>
        </div>
      </div>

      {/* Lado derecho - Imagen aleatoria */}
      <div className="hidden lg:flex lg:flex-1 lg:relative lg:overflow-hidden">
        <Image
          src={randomImage}
          alt="Imagen de login"
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
      </div>
    </div>
  )
}

