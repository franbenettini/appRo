

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { X, Plus, Calendar } from "lucide-react"
import { formatDate } from "@/lib/utils"

const rutaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(200, "El nombre no puede exceder 200 caracteres"),
  fecha_inicio: z.string().min(1, "La fecha de inicio es requerida"),
  descripcion: z.string().max(500, "La descripción no puede exceder 500 caracteres").optional(),
  estado: z.enum(["planificada", "finalizada"]).default("planificada"),
  clientes: z.array(z.object({
    client_id: z.string().min(1, "Debe seleccionar un cliente"),
    orden: z.number().min(0),
  })).min(1, "Debe agregar al menos un cliente"),
})

type RutaFormValues = z.infer<typeof rutaSchema>

interface Client {
  id: string
  razon_social: string | null
  nombre_establecimiento: string | null
}

interface AddRutaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rutaId?: string | null
  onSuccess?: () => void
}

export function AddRutaDialog({ open, onOpenChange, rutaId, onSuccess }: AddRutaDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableClients, setAvailableClients] = useState<Client[]>([])
  const supabase = createClient()
  const isEditing = !!rutaId

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
    watch,
  } = useForm<RutaFormValues>({
    resolver: zodResolver(rutaSchema),
    defaultValues: {
      nombre: "",
      fecha_inicio: "",
      descripcion: "",
      estado: "planificada",
      clientes: [{ client_id: "", orden: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "clientes",
  })

  const clientes = watch("clientes")
  const fechaValue = watch("fecha_inicio")

  // Función para formatear fecha de YYYY-MM-DD a DD/MM/YYYY
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString + "T00:00:00")
      if (isNaN(date.getTime())) return ""
      const day = String(date.getDate()).padStart(2, "0")
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return ""
    }
  }

  // Función para convertir DD/MM/YYYY a YYYY-MM-DD
  const parseDateInput = (dateString: string): string => {
    if (!dateString) return ""
    // Si ya está en formato YYYY-MM-DD, devolverlo
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString
    
    // Intentar parsear DD/MM/YYYY
    const parts = dateString.split("/")
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0")
      const month = parts[1].padStart(2, "0")
      const year = parts[2]
      if (day && month && year && year.length === 4) {
        return `${year}-${month}-${day}`
      }
    }
    return ""
  }

  useEffect(() => {
    if (open) {
      setError(null)
      setLoading(false)
      loadAvailableClients()
      if (isEditing && rutaId) {
        loadRutaData()
      } else {
        reset({
          nombre: "",
          fecha_inicio: "",
          descripcion: "",
          estado: "planificada",
          clientes: [{ client_id: "", orden: 0 }],
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rutaId])

  const loadAvailableClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, razon_social, nombre_establecimiento")
        .eq("created_by", user.id)
        .order("razon_social", { ascending: true })

      if (clientsError) {
        console.error("Error loading clients:", clientsError)
        return
      }

      setAvailableClients(clientsData || [])
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const loadRutaData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !rutaId) return

      // Cargar datos de la ruta
      const { data: rutaData, error: rutaError } = await supabase
        .from("rutas")
        .select("*")
        .eq("id", rutaId)
        .eq("created_by", user.id)
        .single()

      if (rutaError || !rutaData) {
        setError("Error al cargar la ruta")
        return
      }

      // Cargar clientes de la ruta
      const { data: rutaClientesData, error: rutaClientesError } = await supabase
        .from("ruta_clientes")
        .select("client_id, orden")
        .eq("ruta_id", rutaId)
        .order("orden", { ascending: true })

      if (rutaClientesError) {
        console.error("Error loading ruta clientes:", rutaClientesError)
      }

      // Formatear fecha para el input (usar directamente si viene en formato YYYY-MM-DD)
      // Buscar fecha_inicio primero, luego fecha para compatibilidad
      const fechaRuta = rutaData.fecha_inicio || rutaData.fecha
      let fechaFormateada = ""
      if (fechaRuta) {
        // Si ya viene en formato YYYY-MM-DD, usarlo directamente
        if (typeof fechaRuta === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fechaRuta)) {
          fechaFormateada = fechaRuta
        } else {
          // Si viene como Date object u otro formato, convertir
          const date = new Date(fechaRuta)
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, "0")
            const day = String(date.getDate()).padStart(2, "0")
            fechaFormateada = `${year}-${month}-${day}`
          }
        }
      }

      reset({
        nombre: rutaData.nombre || "",
        fecha_inicio: fechaFormateada,
        descripcion: rutaData.descripcion || "",
        estado: rutaData.estado || "planificada",
        clientes: rutaClientesData && rutaClientesData.length > 0
          ? rutaClientesData.map((rc, index) => ({
              client_id: rc.client_id,
              orden: rc.orden || index,
            }))
          : [{ client_id: "", orden: 0 }],
      })
    } catch (error) {
      console.error("Error:", error)
      setError("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: RutaFormValues) => {
    setError(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("No estás autenticado")
        return
      }

      if (isEditing && rutaId) {
        // Actualizar ruta existente
        const { error: updateError } = await supabase
          .from("rutas")
          .update({
            nombre: data.nombre,
            fecha_inicio: data.fecha_inicio,
            descripcion: data.descripcion || null,
            estado: data.estado,
          })
          .eq("id", rutaId)
          .eq("created_by", user.id)

        if (updateError) {
          setError(updateError.message)
          return
        }

        // Eliminar clientes existentes
        const { error: deleteError } = await supabase
          .from("ruta_clientes")
          .delete()
          .eq("ruta_id", rutaId)

        if (deleteError) {
          console.error("Error deleting ruta clientes:", deleteError)
        }

        // Insertar nuevos clientes
        if (data.clientes.length > 0) {
          const rutaClientesToInsert = data.clientes.map((cliente, index) => ({
            ruta_id: rutaId,
            client_id: cliente.client_id,
            orden: cliente.orden || index,
          }))

          const { error: insertError } = await supabase
            .from("ruta_clientes")
            .insert(rutaClientesToInsert)

          if (insertError) {
            setError(insertError.message)
            return
          }
        }
      } else {
        // Crear nueva ruta
        const { data: newRuta, error: insertError } = await supabase
          .from("rutas")
          .insert({
            nombre: data.nombre,
            fecha_inicio: data.fecha_inicio,
            descripcion: data.descripcion || null,
            estado: data.estado,
            created_by: user.id,
          })
          .select()
          .single()

        if (insertError || !newRuta) {
          setError(insertError?.message || "Error al crear la ruta")
          return
        }

        // Insertar clientes de la ruta
        if (data.clientes.length > 0) {
          const rutaClientesToInsert = data.clientes.map((cliente, index) => ({
            ruta_id: newRuta.id,
            client_id: cliente.client_id,
            orden: cliente.orden || index,
          }))

          const { error: rutaClientesError } = await supabase
            .from("ruta_clientes")
            .insert(rutaClientesToInsert)

          if (rutaClientesError) {
            setError(rutaClientesError.message)
            return
          }
        }
      }

      onSuccess?.()
      onOpenChange(false)
      reset()
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  const getClientDisplayName = (clientId: string) => {
    const client = availableClients.find(c => c.id === clientId)
    if (!client) return ""
    return client.razon_social || client.nombre_establecimiento || "Sin nombre"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Ruta" : "Nueva Ruta"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la ruta y sus clientes"
              : "Crea una nueva ruta y asigna los clientes a visitar"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">
              Nombre de la Ruta <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre"
              {...register("nombre")}
              placeholder="Ej: Ruta Norte - Enero 2024"
              disabled={loading}
            />
            {errors.nombre && (
              <p className="text-sm text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">
                Fecha <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                <Input
                  id="fecha_inicio"
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={fechaValue ? formatDateForDisplay(fechaValue) : ""}
                  onChange={(e) => {
                    const inputValue = e.target.value
                    // Permitir solo números y barras
                    const cleaned = inputValue.replace(/[^\d/]/g, "")
                    
                    // Formatear mientras el usuario escribe
                    let formatted = cleaned
                    if (cleaned.length > 2 && !cleaned.includes("/")) {
                      formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2)
                    }
                    if (formatted.length > 5 && formatted.split("/").length === 2) {
                      formatted = formatted.slice(0, 5) + "/" + formatted.slice(5, 9)
                    }
                    
                    // Limitar a 10 caracteres (dd/mm/yyyy)
                    formatted = formatted.slice(0, 10)
                    
                    // Convertir a formato YYYY-MM-DD para guardar
                    const isoDate = parseDateInput(formatted)
                    if (isoDate || formatted === "") {
                      setValue("fecha_inicio", isoDate, { shouldValidate: true })
                    }
                  }}
                  onBlur={(e) => {
                    // Validar y formatear al perder el foco
                    const parsed = parseDateInput(e.target.value)
                    if (parsed) {
                      setValue("fecha_inicio", parsed, { shouldValidate: true })
                    } else if (e.target.value) {
                      // Si hay valor pero no es válido, limpiar
                      setValue("fecha_inicio", "", { shouldValidate: true })
                    }
                  }}
                  disabled={loading}
                  maxLength={10}
                  className="pr-10"
                />
                <input
                  type="date"
                  id="fecha_inicio-calendar"
                  className="absolute opacity-0 pointer-events-none w-0 h-0"
                  value={fechaValue || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setValue("fecha_inicio", e.target.value, { shouldValidate: true })
                    }
                  }}
                  disabled={loading}
                />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                onClick={() => {
                  const dateInput = document.getElementById("fecha_inicio-calendar") as HTMLInputElement
                  if (dateInput) {
                    if (dateInput.showPicker) {
                      dateInput.showPicker()
                    } else {
                      dateInput.click()
                    }
                  }
                }}
                  disabled={loading}
                  title="Seleccionar fecha"
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
              {errors.fecha_inicio && (
                <p className="text-sm text-destructive">{errors.fecha_inicio.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={watch("estado")}
                onValueChange={(value) => setValue("estado", value as "planificada" | "finalizada")}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planificada">Planificada</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              {...register("descripcion")}
              placeholder="Notas adicionales sobre la ruta..."
              disabled={loading}
              rows={3}
            />
            {errors.descripcion && (
              <p className="text-sm text-destructive">{errors.descripcion.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Clientes en la Ruta <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ client_id: "", orden: fields.length })}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar Cliente
              </Button>
            </div>

            {fields.map((field, index) => {
              const clientOptions = availableClients.map((client: any) => {
                const nombre = client.razon_social || client.nombre_establecimiento || "Sin nombre"
                const detalles: string[] = []
                if (client.cuit) detalles.push(`CUIT: ${client.cuit}`)
                if (client.localidad) detalles.push(client.localidad)
                if (client.provincia) detalles.push(client.provincia)
                const contactos = client.client_contacts || []
                if (contactos.length > 0) {
                  const tiposContacto = contactos.map((c: any) => c.tipo_contacto).filter(Boolean)
                  if (tiposContacto.length > 0) {
                    detalles.push(`Contactos: ${tiposContacto.join(", ")}`)
                  }
                }
                const label = detalles.length > 0 
                  ? `${nombre} (${detalles.join(" - ")})`
                  : nombre
                return {
                  value: client.id,
                  label: label,
                  searchText: [
                    nombre,
                    client.razon_social,
                    client.nombre_establecimiento,
                    client.cuit,
                    client.localidad,
                    client.provincia,
                    ...(contactos.map((c: any) => [
                      c.nombre,
                      c.email,
                      c.telefono,
                      c.tipo_contacto
                    ].filter(Boolean).join(" ")))
                  ].filter(Boolean).join(" ").toLowerCase()
                }
              })

              return (
                <div key={field.id} className="flex items-start gap-2 p-3 border rounded-md">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium w-8">#{index + 1}</span>
                      <div className="flex-1">
                        <Combobox
                          options={clientOptions}
                          value={clientes[index]?.client_id || ""}
                          onValueChange={(value) => {
                            setValue(`clientes.${index}.client_id`, value)
                            setValue(`clientes.${index}.orden`, index)
                          }}
                          placeholder="Buscar y seleccionar cliente..."
                          searchPlaceholder="Buscar por nombre, CUIT, localidad, contacto..."
                          emptyMessage="No se encontraron clientes."
                          disabled={loading}
                        />
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={loading}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {errors.clientes?.[index]?.client_id && (
                      <p className="text-sm text-destructive">
                        {errors.clientes[index]?.client_id?.message}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}

            {errors.clientes && typeof errors.clientes.message === "string" && (
              <p className="text-sm text-destructive">{errors.clientes.message}</p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"} Ruta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

