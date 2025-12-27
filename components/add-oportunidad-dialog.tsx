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

const ESTADOS_CLIENTE = [
  "Enviar cotización",
  "Cotización enviada",
  "Seguimiento en 30 días",
  "Seguimiento en 15 días",
  "Pendiente de respuesta",
  "En negociación",
  "Cerrado",
  "Sin interés",
  "Otro",
]

const oportunidadSchema = z.object({
  client_id: z.string().min(1, "Debe seleccionar un cliente"),
  titulo: z.string().min(1, "El título es requerido").max(200, "El título no puede exceder 200 caracteres"),
  descripcion: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional(),
  valor_estimado: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true
    const num = parseFloat(val)
    return !isNaN(num) && num >= 0
  }, {
    message: "El valor debe ser un número válido"
  }),
  probabilidad: z.string().refine((val) => {
    const num = parseInt(val)
    return !isNaN(num) && num >= 0 && num <= 100
  }, {
    message: "La probabilidad debe ser un número entre 0 y 100"
  }),
  estado: z.enum(["nueva", "en_seguimiento", "ganada", "perdida", "cerrada"]).default("nueva"),
  estado_cliente: z.string().optional(), // Estado del cliente en la ruta
  fecha_cierre_estimada: z.string().optional(),
  notas: z.string().max(1000, "Las notas no pueden exceder 1000 caracteres").optional(),
})

type OportunidadFormValues = z.infer<typeof oportunidadSchema>

interface Client {
  id: string
  razon_social: string | null
  nombre_establecimiento: string | null
}

interface AddOportunidadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oportunidadId?: string | null
  clientId?: string | null // Si se pasa, preselecciona este cliente
  rutaClienteId?: string | null // ID del registro en ruta_clientes para actualizar estado_cliente
  estadoClienteInicial?: string | null // Estado inicial del cliente en la ruta
  onSuccess?: () => void
}

export function AddOportunidadDialog({ 
  open, 
  onOpenChange, 
  oportunidadId, 
  clientId,
  rutaClienteId,
  estadoClienteInicial,
  onSuccess 
}: AddOportunidadDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableClients, setAvailableClients] = useState<Client[]>([])
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
      valor_estimado: "",
      probabilidad: "50",
      estado: "nueva",
      estado_cliente: "",
      fecha_cierre_estimada: "",
      notas: "",
    },
  })

  const estado = watch("estado")
  const estadoCliente = watch("estado_cliente")
  const selectedClientId = watch("client_id")

  useEffect(() => {
    if (open) {
      setError(null)
      setLoading(false)
      loadAvailableClients()
      if (isEditing && oportunidadId) {
        loadOportunidadData()
      } else {
        reset({
          client_id: clientId || "",
          titulo: "",
          descripcion: "",
          valor_estimado: "",
          probabilidad: "50",
          estado: "nueva",
          estado_cliente: estadoClienteInicial || "",
          fecha_cierre_estimada: "",
          notas: "",
        })
      }
    }
  }, [open, oportunidadId, clientId])

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

      const { data: oportunidadData, error: oportunidadError } = await supabase
        .from("oportunidades")
        .select("*")
        .eq("id", oportunidadId)
        .eq("created_by", user.id)
        .single()

      if (oportunidadError || !oportunidadData) {
        setError("Error al cargar la oportunidad")
        return
      }

      reset({
        client_id: oportunidadData.client_id || "",
        titulo: oportunidadData.titulo || "",
        descripcion: oportunidadData.descripcion || "",
        valor_estimado: oportunidadData.valor_estimado?.toString() || "",
        probabilidad: oportunidadData.probabilidad?.toString() || "50",
        estado: oportunidadData.estado || "nueva",
        estado_cliente: estadoClienteInicial || "",
        fecha_cierre_estimada: oportunidadData.fecha_cierre_estimada
          ? new Date(oportunidadData.fecha_cierre_estimada).toISOString().split('T')[0]
          : "",
        notas: oportunidadData.notas || "",
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

      const oportunidadData: any = {
        client_id: data.client_id,
        titulo: data.titulo,
        descripcion: data.descripcion || null,
        valor_estimado: data.valor_estimado ? parseFloat(data.valor_estimado) : null,
        probabilidad: parseInt(data.probabilidad),
        estado: data.estado,
        fecha_cierre_estimada: data.fecha_cierre_estimada || null,
        notas: data.notas || null,
      }

      if (isEditing && oportunidadId) {
        // Actualizar oportunidad existente
        const { error: updateError } = await supabase
          .from("oportunidades")
          .update(oportunidadData)
          .eq("id", oportunidadId)
          .eq("created_by", user.id)

        if (updateError) {
          setError(updateError.message)
          return
        }
      } else {
        // Crear nueva oportunidad
        oportunidadData.created_by = user.id

        const { error: insertError } = await supabase
          .from("oportunidades")
          .insert(oportunidadData)

        if (insertError) {
          setError(insertError.message)
          return
        }
      }

      // Actualizar estado_cliente en ruta_clientes si se proporcionó rutaClienteId
      if (rutaClienteId && data.estado_cliente) {
        const { error: updateRutaClienteError } = await supabase
          .from("ruta_clientes")
          .update({ estado_cliente: data.estado_cliente })
          .eq("id", rutaClienteId)

        if (updateRutaClienteError) {
          console.error("Error updating estado_cliente:", updateRutaClienteError)
          // No fallar la operación si solo falla la actualización del estado
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
            <Select
              value={selectedClientId}
              onValueChange={(value) => setValue("client_id", value)}
              disabled={loading || !!clientId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {availableClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.razon_social || client.nombre_establecimiento || "Sin nombre"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.client_id && (
              <p className="text-sm text-destructive">{errors.client_id.message}</p>
            )}
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
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              {...register("descripcion")}
              placeholder="Descripción detallada de la oportunidad..."
              disabled={loading}
              rows={3}
            />
            {errors.descripcion && (
              <p className="text-sm text-destructive">{errors.descripcion.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_estimado">Valor Estimado</Label>
              <Input
                id="valor_estimado"
                type="number"
                step="0.01"
                {...register("valor_estimado")}
                placeholder="0.00"
                disabled={loading}
              />
              {errors.valor_estimado && (
                <p className="text-sm text-destructive">{errors.valor_estimado.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="probabilidad">Probabilidad (%)</Label>
              <Input
                id="probabilidad"
                type="number"
                min="0"
                max="100"
                {...register("probabilidad")}
                placeholder="50"
                disabled={loading}
              />
              {errors.probabilidad && (
                <p className="text-sm text-destructive">{errors.probabilidad.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estado">Estado de la Oportunidad</Label>
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
                  <SelectItem value="ganada">Ganada</SelectItem>
                  <SelectItem value="perdida">Perdida</SelectItem>
                  <SelectItem value="cerrada">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_cierre_estimada">Fecha de Cierre Estimada</Label>
              <Input
                id="fecha_cierre_estimada"
                type="date"
                {...register("fecha_cierre_estimada")}
                disabled={loading}
              />
            </div>
          </div>

          {rutaClienteId && (
            <div className="space-y-2">
              <Label htmlFor="estado_cliente">
                Estado del Cliente
              </Label>
              <Select
                value={estadoCliente || ""}
                onValueChange={(value) => setValue("estado_cliente", value)}
                disabled={loading}
              >
                <SelectTrigger id="estado_cliente">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_CLIENTE.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              {...register("notas")}
              placeholder="Notas adicionales..."
              disabled={loading}
              rows={2}
            />
            {errors.notas && (
              <p className="text-sm text-destructive">{errors.notas.message}</p>
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

