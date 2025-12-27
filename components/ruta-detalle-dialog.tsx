"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Plus, Calendar } from "lucide-react"
import { AddOportunidadDialog } from "@/components/add-oportunidad-dialog"

interface RutaDetalle {
  id: string
  nombre: string
  fecha_inicio: string
  descripcion: string | null
  fecha_finalizacion: string | null
  estado: string
}

interface RutaCliente {
  id: string
  client_id: string
  orden: number
  visitado: boolean
  fecha_visita: string | null
  estado_cliente: string | null
  notas: string | null
  cliente: {
    razon_social: string | null
    nombre_establecimiento: string | null
  }
}

interface RutaDetalleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rutaId: string
  onSuccess?: () => void
}

export function RutaDetalleDialog({ open, onOpenChange, rutaId, onSuccess }: RutaDetalleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [ruta, setRuta] = useState<RutaDetalle | null>(null)
  const [rutaClientes, setRutaClientes] = useState<RutaCliente[]>([])
  const [updates, setUpdates] = useState<Record<string, Partial<RutaCliente>>>({})
  const [fechaFinalizacion, setFechaFinalizacion] = useState<string>("")
  const [fechaFinalizacionInicial, setFechaFinalizacionInicial] = useState<string>("")
  const [oportunidadDialogOpen, setOportunidadDialogOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedRutaClienteId, setSelectedRutaClienteId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (open && rutaId) {
      loadRutaDetalle()
    }
  }, [open, rutaId])

  const loadRutaDetalle = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Cargar datos de la ruta
      const { data: rutaData, error: rutaError } = await supabase
        .from("rutas")
        .select("*")
        .eq("id", rutaId)
        .eq("created_by", user.id)
        .single()

      if (rutaError || !rutaData) {
        console.error("Error loading ruta:", rutaError)
        return
      }

      setRuta(rutaData)
      
      // Cargar fecha de finalización (usar directamente si viene en formato YYYY-MM-DD)
      let fechaFinalizacionFormateada = ""
      if (rutaData.fecha_finalizacion) {
        // Si ya viene en formato YYYY-MM-DD, usarlo directamente
        if (typeof rutaData.fecha_finalizacion === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rutaData.fecha_finalizacion)) {
          fechaFinalizacionFormateada = rutaData.fecha_finalizacion
        } else {
          // Si viene como Date object u otro formato, convertir
          const date = new Date(rutaData.fecha_finalizacion)
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, "0")
            const day = String(date.getDate()).padStart(2, "0")
            fechaFinalizacionFormateada = `${year}-${month}-${day}`
          }
        }
      }
      setFechaFinalizacion(fechaFinalizacionFormateada)
      setFechaFinalizacionInicial(fechaFinalizacionFormateada)

      // Cargar clientes de la ruta
      const { data: rutaClientesData, error: rutaClientesError } = await supabase
        .from("ruta_clientes")
        .select("*")
        .eq("ruta_id", rutaId)
        .order("orden", { ascending: true })

      if (rutaClientesError) {
        console.error("Error loading ruta clientes:", rutaClientesError)
        return
      }

      // Obtener datos de los clientes
      if (rutaClientesData && rutaClientesData.length > 0) {
        const clientIds = rutaClientesData.map(rc => rc.client_id)
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, razon_social, nombre_establecimiento")
          .in("id", clientIds)

        if (clientsError) {
          console.error("Error loading clients:", clientsError)
          return
        }

        // Combinar datos
        const clientsMap = new Map((clientsData || []).map(c => [c.id, c]))
        const formattedData = rutaClientesData.map((rc: any) => ({
          ...rc,
          cliente: clientsMap.get(rc.client_id) || { razon_social: null, nombre_establecimiento: null }
        }))

        setRutaClientes(formattedData)
      } else {
        setRutaClientes([])
      }
      setUpdates({})
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleVisitadoChange = (rutaClienteId: string, visitado: boolean) => {
    setUpdates(prev => ({
      ...prev,
      [rutaClienteId]: {
        ...prev[rutaClienteId],
        visitado,
        fecha_visita: visitado ? new Date().toISOString() : null,
      }
    }))
  }

  const handleFieldChange = (rutaClienteId: string, field: keyof RutaCliente, value: any) => {
    setUpdates(prev => ({
      ...prev,
      [rutaClienteId]: {
        ...prev[rutaClienteId],
        [field]: value,
      }
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Guardar los updates de clientes antes de limpiarlos
      const hasClientUpdates = Object.keys(updates).length > 0

      // Actualizar cada cliente de la ruta que tenga cambios
      if (hasClientUpdates) {
        const updatePromises = Object.entries(updates).map(([rutaClienteId, changes]) => {
          return supabase
            .from("ruta_clientes")
            .update(changes)
            .eq("id", rutaClienteId)
        })

        await Promise.all(updatePromises)
      }

      // Actualizar fecha de finalización y estado si se proporcionó
      const updatesRuta: any = {}
      if (fechaFinalizacion) {
        updatesRuta.fecha_finalizacion = fechaFinalizacion
        updatesRuta.estado = "finalizada"
      }

      if (Object.keys(updatesRuta).length > 0) {
        await supabase
          .from("rutas")
          .update(updatesRuta)
          .eq("id", rutaId)
        
        // Actualizar el estado local de la ruta sin recargar todo
        setRuta(prev => prev ? { ...prev, ...updatesRuta } : null)
        // Actualizar el estado inicial de fecha de finalización para que el botón desaparezca
        if (updatesRuta.fecha_finalizacion) {
          setFechaFinalizacionInicial(updatesRuta.fecha_finalizacion)
        }
      }

      // Limpiar los updates de clientes
      setUpdates({})
      
      // Recargar solo los datos de clientes si hay cambios en ellos
      if (hasClientUpdates) {
        loadRutaDetalle()
      }
      
      // Llamar onSuccess para actualizar la lista (incluye cuando solo se cambia fecha de finalización)
      // Esto actualiza la lista para mostrar el rango de fechas
      onSuccess?.()
      
      // Cerrar el diálogo después de guardar
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving:", error)
    } finally {
      setLoading(false)
    }
  }

  const getClientDisplayName = (cliente: { razon_social: string | null; nombre_establecimiento: string | null }) => {
    return cliente.razon_social || cliente.nombre_establecimiento || "Sin nombre"
  }

  if (!ruta) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ruta.nombre}</DialogTitle>
          <DialogDescription>
            Fecha Inicio: {formatDate(ruta.fecha_inicio)}
            {ruta.fecha_finalizacion && (
              <> - Fecha Finalización: {formatDate(ruta.fecha_finalizacion)}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 border-b pb-4">
            <Label htmlFor="fecha_finalizacion">Fecha de Finalización</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="fecha_finalizacion"
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={fechaFinalizacion ? (() => {
                    try {
                      if (/^\d{4}-\d{2}-\d{2}$/.test(fechaFinalizacion)) {
                        const [year, month, day] = fechaFinalizacion.split("-")
                        return `${day}/${month}/${year}`
                      }
                      return fechaFinalizacion
                    } catch {
                      return ""
                    }
                  })() : ""}
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
                    const parts = formatted.split("/")
                    if (parts.length === 3 && parts[0] && parts[1] && parts[2] && parts[2].length === 4) {
                      const day = parts[0].padStart(2, "0")
                      const month = parts[1].padStart(2, "0")
                      const year = parts[2]
                      setFechaFinalizacion(`${year}-${month}-${day}`)
                    } else if (formatted === "") {
                      setFechaFinalizacion("")
                    }
                  }}
                  onBlur={(e) => {
                    // Validar y formatear al perder el foco
                    const parts = e.target.value.split("/")
                    if (parts.length === 3 && parts[0] && parts[1] && parts[2] && parts[2].length === 4) {
                      const day = parts[0].padStart(2, "0")
                      const month = parts[1].padStart(2, "0")
                      const year = parts[2]
                      setFechaFinalizacion(`${year}-${month}-${day}`)
                    } else if (e.target.value) {
                      // Si hay valor pero no es válido, limpiar
                      setFechaFinalizacion("")
                    }
                  }}
                  disabled={loading}
                  maxLength={10}
                  className="pr-10"
                />
                <input
                  type="date"
                  id="fecha_finalizacion-calendar"
                  className="absolute opacity-0 pointer-events-none w-0 h-0"
                  value={fechaFinalizacion || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setFechaFinalizacion(e.target.value)
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
                  const dateInput = document.getElementById("fecha_finalizacion-calendar") as HTMLInputElement
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
            <p className="text-xs text-muted-foreground">
              Al establecer una fecha de finalización, la ruta se marcará como "Finalizada"
            </p>
          </div>
          {rutaClientes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay clientes en esta ruta
            </p>
          ) : (
            rutaClientes.map((rc) => {
              const updated = updates[rc.id] || {}
              const visitado = updated.visitado ?? rc.visitado
              const fechaVisita = updated.fecha_visita ?? rc.fecha_visita
              const estadoCliente = updated.estado_cliente ?? rc.estado_cliente ?? ""
              const notas = updated.notas ?? rc.notas ?? ""

              return (
                <div key={rc.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {visitado ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">
                            #{rc.orden + 1} - {getClientDisplayName(rc.cliente)}
                          </h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedClientId(rc.client_id)
                              setSelectedRutaClienteId(rc.id)
                              setOportunidadDialogOpen(true)
                            }}
                            disabled={!visitado}
                            className="h-7 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Oportunidad
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Checkbox
                            id={`visitado-${rc.id}`}
                            checked={visitado}
                            onCheckedChange={(checked) =>
                              handleVisitadoChange(rc.id, checked === true)
                            }
                            disabled={loading}
                          />
                          <Label
                            htmlFor={`visitado-${rc.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            Cliente visitado
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {visitado && (
                    <div className="space-y-3 pl-8 border-l-2 border-primary/20">
                      <div className="space-y-2">
                        <Label htmlFor={`notas-${rc.id}`} className="text-sm">
                          Notas Adicionales
                        </Label>
                        <Textarea
                          id={`notas-${rc.id}`}
                          value={notas}
                          onChange={(e) =>
                            handleFieldChange(rc.id, "notas", e.target.value)
                          }
                          placeholder="Notas sobre la visita..."
                          disabled={loading}
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}

          <AddOportunidadDialog
            open={oportunidadDialogOpen}
            onOpenChange={(open) => {
              setOportunidadDialogOpen(open)
              if (!open) {
                setSelectedClientId(null)
                setSelectedRutaClienteId(null)
              }
            }}
            clientId={selectedClientId}
            rutaClienteId={selectedRutaClienteId}
            estadoClienteInicial={selectedRutaClienteId ? (updates[selectedRutaClienteId]?.estado_cliente ?? rutaClientes.find(rc => rc.id === selectedRutaClienteId)?.estado_cliente ?? null) : null}
            onSuccess={() => {
              setOportunidadDialogOpen(false)
              setSelectedClientId(null)
              setSelectedRutaClienteId(null)
              loadRutaDetalle() // Recargar para actualizar el estado
            }}
          />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cerrar
            </Button>
            {(Object.keys(updates).length > 0 || fechaFinalizacion !== fechaFinalizacionInicial) && (
              <Button
                type="button"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

