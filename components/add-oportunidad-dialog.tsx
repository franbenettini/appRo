"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useForm } from "react-hook-form"
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

const oportunidadSchema = z.object({
  client_id: z.string().min(1, "Debe seleccionar un cliente"),
  titulo: z.string().min(1, "El título es requerido").max(200, "El título no puede exceder 200 caracteres"),
  descripcion: z.string().min(1, "La descripción es requerida").max(1000, "La descripción no puede exceder 1000 caracteres"),
  estado: z.enum([
    "nueva", 
    "en_seguimiento", 
    "enviar_cotizacion",
    "cotizacion_enviada",
    "ganada", 
    "perdida", 
    "cerrada"
  ]).default("nueva"),
  producto_id: z.string().optional().nullable(), // Producto del catálogo
  tipo_producto: z.enum(["descartables"]).optional().nullable(), // Para distinguir "Descartables" de "Ninguno"
})

type OportunidadFormValues = z.infer<typeof oportunidadSchema>

interface Client {
  id: string
  razon_social: string | null
  nombre_establecimiento: string | null
  cuit?: string | null
  localidad?: string | null
  provincia?: string | null
  client_contacts?: Array<{
    nombre: string | null
    tipo_contacto: string
    email: string | null
    telefono: string | null
  }>
}

interface AddOportunidadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oportunidadId?: string | null
  clientId?: string | null // Si se pasa, preselecciona este cliente
  productoId?: string | null // Si se pasa, preselecciona este producto
  rutaClienteId?: string | null // ID del registro en ruta_clientes (mantenido por compatibilidad pero no se usa)
  onSuccess?: () => void
}

interface Producto {
  id: string
  nombre_equipo: string
  marca: string
  modelo: string
  rubro: string
  imagen_url?: string | null
}

export function AddOportunidadDialog({ 
  open, 
  onOpenChange, 
  oportunidadId, 
  clientId,
  productoId,
  rutaClienteId,
  onSuccess 
}: AddOportunidadDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableClients, setAvailableClients] = useState<Client[]>([])
  const [availableProductos, setAvailableProductos] = useState<Producto[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()
  const isEditing = !!oportunidadId

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<OportunidadFormValues>({
    resolver: zodResolver(oportunidadSchema),
    defaultValues: {
      client_id: "",
      titulo: "",
      descripcion: "",
      estado: "nueva",
      producto_id: null,
      tipo_producto: null,
    },
  })

  const estado = watch("estado")
  const selectedClientId = watch("client_id")
  const selectedProductoId = watch("producto_id")
  const tipoProducto = watch("tipo_producto")

  useEffect(() => {
    if (open) {
      setError(null)
      setLoading(false)
      loadAvailableClients()
      loadAvailableProductos()
      if (isEditing && oportunidadId) {
        loadOportunidadData()
      } else {
        reset({
          client_id: clientId || "",
          titulo: "",
          descripcion: "",
          estado: "nueva",
          producto_id: productoId || null,
          tipo_producto: null,
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, oportunidadId, clientId, productoId])

  const loadAvailableProductos = async () => {
    try {
      const { data: productosData, error } = await supabase
        .from("productos")
        .select("id, nombre_equipo, marca, modelo, rubro, imagen_url")
        .eq("activo", true)
        .order("nombre_equipo", { ascending: true })

      if (error) {
        console.error("Error loading productos:", error)
        return
      }

      setAvailableProductos(productosData || [])
    } catch (error) {
      console.error("Error:", error)
    }
  }

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

  const loadOportunidadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !oportunidadId) return

      setCurrentUserId(user.id)

      // Verificar si el usuario es admin
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

      const userIsAdmin = !userError && userData?.role === "admin"
      setIsAdmin(userIsAdmin)

      const { data: oportunidadData, error: oportunidadError } = await supabase
        .from("oportunidades")
        .select("*, producto:productos(id, nombre_equipo, marca, modelo, rubro)")
        .eq("id", oportunidadId)
        .single()

      if (oportunidadError || !oportunidadData) {
        setError("Error al cargar la oportunidad")
        return
      }

      // Verificar permisos: solo admin o creador pueden editar
      if (!userIsAdmin && oportunidadData.created_by !== user.id) {
        setError("No tienes permisos para editar esta oportunidad")
        return
      }

      reset({
        client_id: oportunidadData.client_id || "",
        titulo: oportunidadData.titulo || "",
        descripcion: oportunidadData.descripcion || "",
        estado: oportunidadData.estado || "nueva",
        producto_id: oportunidadData.producto_id || null,
        tipo_producto: oportunidadData.tipo_producto || null,
      })
    } catch (error) {
      console.error("Error:", error)
      setError("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: OportunidadFormValues) => {
    setError(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("No estás autenticado")
        return
      }

      // Manejar producto_id y tipo_producto
      let productoIdToSave: string | null = null
      let tipoProductoToSave: string | null = null
      
      if (data.producto_id && data.producto_id !== "none" && data.producto_id !== "descartables") {
        // Es un producto del catálogo
        productoIdToSave = data.producto_id
        tipoProductoToSave = null
      } else if (data.tipo_producto === "descartables" || data.producto_id === "descartables") {
        // Es "Descartables"
        productoIdToSave = null
        tipoProductoToSave = "descartables"
      } else {
        // Es "Ninguno"
        productoIdToSave = null
        tipoProductoToSave = null
      }

      const oportunidadData: any = {
        client_id: data.client_id,
        titulo: data.titulo,
        descripcion: data.descripcion,
        estado: data.estado,
        producto_id: productoIdToSave,
        tipo_producto: tipoProductoToSave,
      }

      if (isEditing && oportunidadId) {
        // Verificar permisos antes de actualizar
        const { data: existingOportunidad, error: checkError } = await supabase
          .from("oportunidades")
          .select("created_by")
          .eq("id", oportunidadId)
          .single()

        if (checkError || !existingOportunidad) {
          setError("Error al verificar permisos")
          return
        }

        // Verificar si es admin o creador
        if (!isAdmin && existingOportunidad.created_by !== user.id) {
          setError("No tienes permisos para editar esta oportunidad")
          return
        }

        // Actualizar oportunidad existente
        let updateQuery = supabase
          .from("oportunidades")
          .update(oportunidadData)
          .eq("id", oportunidadId)

        // Si no es admin, solo puede actualizar sus propias oportunidades
        if (!isAdmin) {
          updateQuery = updateQuery.eq("created_by", user.id)
        }

        const { error: updateError } = await updateQuery

        if (updateError) {
          setError(updateError.message)
          return
        }
      } else {
        // Crear nueva oportunidad
        oportunidadData.created_by = user.id

        const { data: newOportunidad, error: insertError } = await supabase
          .from("oportunidades")
          .insert(oportunidadData)
          .select()
          .single()

        if (insertError) {
          setError(insertError.message)
          return
        }

        // Registrar el estado inicial en el historial
        if (newOportunidad) {
          await supabase
            .from("oportunidad_historial")
            .insert({
              oportunidad_id: newOportunidad.id,
              estado_anterior: null,
              estado_nuevo: oportunidadData.estado,
              comentario: "Oportunidad creada",
              changed_by: user.id,
            })
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Oportunidad" : "Nueva Oportunidad"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la oportunidad"
              : "Crea una nueva oportunidad de venta para un cliente"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">
              Cliente <span className="text-destructive">*</span>
            </Label>
            <Combobox
              options={availableClients.map((client) => {
                const nombre = client.razon_social || client.nombre_establecimiento || "Sin nombre"
                const detalles: string[] = []
                if (client.cuit) detalles.push(`CUIT: ${client.cuit}`)
                if (client.localidad) detalles.push(client.localidad)
                if (client.provincia) detalles.push(client.provincia)
                const contactos = (client as any).client_contacts || []
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
              })}
              value={selectedClientId || ""}
              onValueChange={(value) => setValue("client_id", value)}
              placeholder="Buscar y seleccionar cliente..."
              searchPlaceholder="Buscar por nombre, CUIT, localidad, contacto..."
              emptyMessage="No se encontraron clientes."
              disabled={loading || !!clientId}
            />
            {errors.client_id && (
              <p className="text-sm text-destructive">{errors.client_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="producto_id">Producto</Label>
            <Select
              value={
                tipoProducto === "descartables" 
                  ? "descartables" 
                  : selectedProductoId || "none"
              }
              onValueChange={(value) => {
                if (value === "none") {
                  setValue("producto_id", null)
                  setValue("tipo_producto", null)
                } else if (value === "descartables") {
                  setValue("producto_id", null)
                  setValue("tipo_producto", "descartables")
                } else {
                  setValue("producto_id", value)
                  setValue("tipo_producto", null)
                }
              }}
              disabled={loading}
            >
              <SelectTrigger id="producto_id">
                <SelectValue placeholder="Seleccionar producto (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguno</SelectItem>
                <SelectItem value="descartables">Descartables</SelectItem>
                {availableProductos.map((producto) => (
                  <SelectItem key={producto.id} value={producto.id}>
                    {producto.nombre_equipo} - {producto.marca} {producto.modelo} ({producto.rubro})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="titulo"
              {...register("titulo")}
              placeholder="Ej: Venta de producto X"
              disabled={loading}
            />
            {errors.titulo && (
              <p className="text-sm text-destructive">{errors.titulo.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">
              Descripción <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="descripcion"
              {...register("descripcion")}
              placeholder="Descripción detallada de la oportunidad..."
              disabled={loading}
              rows={4}
            />
            {errors.descripcion && (
              <p className="text-sm text-destructive">{errors.descripcion.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">
              Estado de la Oportunidad <span className="text-destructive">*</span>
            </Label>
            <Select
              value={estado}
              onValueChange={(value) => setValue("estado", value as any)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nueva">Nueva</SelectItem>
                <SelectItem value="en_seguimiento">En Seguimiento</SelectItem>
                <SelectItem value="enviar_cotizacion">Enviar Cotización</SelectItem>
                <SelectItem value="cotizacion_enviada">Cotización Enviada</SelectItem>
                <SelectItem value="ganada">Ganada</SelectItem>
                <SelectItem value="perdida">Perdida</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
            {errors.estado && (
              <p className="text-sm text-destructive">{errors.estado.message}</p>
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
              {loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"} Oportunidad
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

