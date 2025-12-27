"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Edit } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { formatDate } from "@/lib/utils"

const userSchema = z.object({
  email: z.string().email("Email inválido").min(1, "El email es requerido"),
  password: z.string().optional().refine((val) => {
    // Si no hay valor o está vacío, es válido (opcional)
    if (!val || val.trim().length === 0) return true
    // Si hay valor, debe tener al menos 6 caracteres
    return val.length >= 6
  }, {
    message: "La contraseña debe tener al menos 6 caracteres"
  }),
  full_name: z.string().min(1, "El nombre completo es requerido").max(200, "El nombre no puede exceder 200 caracteres"),
  role: z.enum(["admin", "user"]).default("user"),
})

type UserFormValues = z.infer<typeof userSchema>

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: "user",
      full_name: "",
    },
  })

  const role = watch("role")

  useEffect(() => {
    const checkAdminAndLoadUsers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single()

        if (userError || userData?.role !== "admin") {
          router.push("/dashboard")
          return
        }

        setIsAdmin(true)
        await loadUsers()
      } catch (error) {
        console.error("Error:", error)
        router.push("/dashboard")
      } finally {
        setLoading(false)
      }
    }

    checkAdminAndLoadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase])

  const loadUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email, full_name, role, created_at")
        .order("created_at", { ascending: false })

      if (usersError) {
        console.error("Error loading users:", usersError)
        return
      }

      setUsers(usersData || [])
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const onSubmit = async (data: UserFormValues) => {
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      if (editingUserId) {
        // Actualizar usuario existente
        const response = await fetch("/api/admin/update-user", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: editingUserId,
            email: data.email,
            password: data.password || undefined,
            full_name: data.full_name,
            role: data.role,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.error || "Error al actualizar el usuario")
          setSubmitting(false)
          return
        }

        setSuccess("Usuario actualizado exitosamente")
        setEditingUserId(null)
        reset()
        await loadUsers()
      } else {
        // Crear nuevo usuario
        if (!data.password) {
          setError("La contraseña es requerida para crear un nuevo usuario")
          setSubmitting(false)
          return
        }

        const response = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            full_name: data.full_name,
            role: data.role,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.error || "Error al crear el usuario")
          setSubmitting(false)
          return
        }

        setSuccess("Usuario creado exitosamente")
        reset()
        await loadUsers()
      }
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (user: any) => {
    setEditingUserId(user.id)
    setValue("email", user.email)
    setValue("full_name", user.full_name || "")
    setValue("role", user.role)
    setValue("password", "") // No pre-llenar contraseña por seguridad
    setError(null)
    setSuccess(null)
  }

  const handleCancel = () => {
    setEditingUserId(null)
    reset({
      role: "user",
      full_name: "",
    })
    setError(null)
    setSuccess(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administración</h1>
          <p className="text-muted-foreground">
            Gestiona usuarios del sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario para agregar usuarios */}
        <div className="space-y-4">
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingUserId ? "Editar Usuario" : "Agregar Nuevo Usuario"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="usuario@example.com"
                  disabled={submitting}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {!editingUserId && (
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Contraseña <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                    placeholder="Mínimo 6 caracteres"
                    disabled={submitting}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>
              )}

              {editingUserId && (
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Nueva Contraseña (dejar vacío para no cambiar)
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                    placeholder="Dejar vacío para mantener la actual"
                    disabled={submitting}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Nombre Completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="full_name"
                  {...register("full_name")}
                  placeholder="Nombre completo del usuario"
                  disabled={submitting}
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">{errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">
                  Rol <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={role}
                  onValueChange={(value) => setValue("role", value as "admin" | "user")}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive">{errors.role.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-md bg-green-100 border border-green-200 p-3 text-sm text-green-800">
                  {success}
                </div>
              )}

              <div className="flex gap-2">
                {editingUserId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={submitting}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                )}
                <Button type="submit" disabled={submitting} className={editingUserId ? "flex-1" : "w-full"}>
                  {submitting 
                    ? (editingUserId ? "Actualizando..." : "Creando...") 
                    : (editingUserId ? "Actualizar Usuario" : "Crear Usuario")
                  }
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Lista de usuarios */}
        <div className="space-y-4">
          <div className="rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Usuarios del Sistema</h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No hay usuarios
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.full_name || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              user.role === "admin"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {user.role === "admin" ? "Administrador" : "Usuario"}
                          </span>
                        </TableCell>
                            <TableCell>
                              {formatDate(user.created_at)}
                            </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(user)}
                            title="Editar usuario"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

