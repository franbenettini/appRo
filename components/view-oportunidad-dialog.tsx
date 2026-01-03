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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { FileText, Clock, Package, Edit, Trash2, ArrowLeft, Eye, Loader2 } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"

interface OportunidadDetalle {
  id: string
  client_id: string
  titulo: string
  descripcion: string | null
  estado: string
  producto_id: string | null
  tipo_producto: string | null
  created_at: string
  created_by: string
  cliente?: {
    id: string
    razon_social: string | null
    nombre_establecimiento: string | null
    direccion: string | null
    localidad: string | null
    provincia: string | null
    client_contacts?: Array<{
      nombre: string | null
      tipo_contacto: string
      email: string | null
      telefono: string | null
    }>
  }
  producto?: {
    id: string
    nombre_equipo: string
    marca: string
    modelo: string
    rubro: string
    imagen_url: string | null
  } | null
}

interface HistorialItem {
  id: string
  estado_anterior: string | null
  estado_nuevo: string
  comentario: string | null
  created_at: string
  changed_by: string
  usuario?: {
    full_name: string | null
    email: string
  }
}

interface ViewOportunidadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oportunidadId: string | null
  onEdit?: (oportunidadId: string) => void
  onDelete?: (oportunidadId: string) => void
  onSuccess?: () => void
}

const ESTADOS_OPORTUNIDAD = [
  { value: "nueva", label: "Nueva" },
  { value: "en_seguimiento", label: "En Seguimiento" },
  { value: "enviar_cotizacion", label: "Enviar Cotización" },
  { value: "cotizacion_enviada", label: "Cotización Enviada" },
  { value: "ganada", label: "Ganada" },
  { value: "perdida", label: "Perdida" },
  { value: "cerrada", label: "Cerrada" },
]

const getEstadoLabel = (estado: string) => {
  const estadoObj = ESTADOS_OPORTUNIDAD.find(e => e.value === estado)
  return estadoObj?.label || estado
}

const getEstadoColor = (estado: string) => {
  const colors: Record<string, string> = {
    nueva: "bg-blue-100 text-blue-800",
    en_seguimiento: "bg-yellow-100 text-yellow-800",
    enviar_cotizacion: "bg-purple-100 text-purple-800",
    cotizacion_enviada: "bg-indigo-100 text-indigo-800",
    ganada: "bg-green-100 text-green-800",
    perdida: "bg-red-100 text-red-800",
    cerrada: "bg-gray-100 text-gray-800",
  }
  return colors[estado] || "bg-gray-100 text-gray-800"
}

export function ViewOportunidadDialog({
  open,
  onOpenChange,
  oportunidadId,
  onEdit,
  onDelete,
  onSuccess,
}: ViewOportunidadDialogProps) {
  const [loading, setLoading] = useState(false)
  const [changingEstado, setChangingEstado] = useState(false)
  const [oportunidad, setOportunidad] = useState<OportunidadDetalle | null>(null)
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [nuevoEstado, setNuevoEstado] = useState<string>("")
  const [comentario, setComentario] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [clientDetails, setClientDetails] = useState<any>(null)
  const [clientContacts, setClientContacts] = useState<any[]>([])
  const [loadingClient, setLoadingClient] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (open && oportunidadId) {
      loadOportunidadData()
      loadHistorial()
    } else {
      setOportunidad(null)
      setHistorial([])
      setNuevoEstado("")
      setComentario("")
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, oportunidadId])

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
        .select(`
          *,
          producto:productos(id, nombre_equipo, marca, modelo, rubro, imagen_url)
        `)
        .eq("id", oportunidadId)
        .single()

      if (oportunidadError || !oportunidadData) {
        setError("Error al cargar la oportunidad")
        return
      }

      // Verificar permisos: solo admin o creador pueden ver
      if (!userIsAdmin && oportunidadData.created_by !== user.id) {
        setError("No tienes permisos para ver esta oportunidad")
        return
      }

      // Obtener datos del cliente con contactos
      const { data: clienteData } = await supabase
        .from("clients")
        .select(`
          id, 
          razon_social, 
          nombre_establecimiento, 
          direccion, 
          localidad, 
          provincia,
          client_contacts (nombre, tipo_contacto, email, telefono)
        `)
        .eq("id", oportunidadData.client_id)
        .single()

      setOportunidad({
        ...oportunidadData,
        cliente: clienteData || undefined,
      })
      setNuevoEstado(oportunidadData.estado)
    } catch (error) {
      console.error("Error:", error)
      setError("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  const loadHistorial = async () => {
    if (!oportunidadId) return

    try {
      const { data: historialData, error: historialError } = await supabase
        .from("oportunidad_historial")
        .select(`
          *,
          usuario:users(id, full_name, email)
        `)
        .eq("oportunidad_id", oportunidadId)
        .order("created_at", { ascending: true })

      if (historialError) {
        console.error("Error loading historial:", historialError)
        return
      }

      setHistorial(historialData || [])
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleCambiarEstado = async () => {
    if (!oportunidadId || !oportunidad || nuevoEstado === oportunidad.estado) return

    try {
      setChangingEstado(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("No estás autenticado")
        return
      }

      // Actualizar el estado de la oportunidad
      const { error: updateError } = await supabase
        .from("oportunidades")
        .update({ estado: nuevoEstado })
        .eq("id", oportunidadId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      // Registrar en el historial
      const { error: historialError } = await supabase
        .from("oportunidad_historial")
        .insert({
          oportunidad_id: oportunidadId,
          estado_anterior: oportunidad.estado,
          estado_nuevo: nuevoEstado,
          comentario: comentario.trim() || null,
          changed_by: user.id,
        })

      if (historialError) {
        console.error("Error al guardar historial:", historialError)
        // No fallar si solo falla el historial
      }

      // Recargar datos completos sin cerrar el diálogo
      await loadOportunidadData()
      await loadHistorial()
      setComentario("")
      
      // Actualizar la lista en segundo plano sin cerrar el diálogo
      // onSuccess solo actualiza refreshTrigger, no debería cerrar el diálogo
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || "Error al cambiar el estado")
    } finally {
      setChangingEstado(false)
    }
  }

  // Cargar detalles completos del cliente
  const loadClientDetails = async () => {
    if (!oportunidad?.cliente?.id) return

    try {
      setLoadingClient(true)
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", oportunidad.cliente.id)
        .single()

      if (clientError || !clientData) {
        console.error("Error loading client details:", clientError)
        return
      }

      // Cargar contactos
      const { data: contactsData, error: contactsError } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", oportunidad.cliente.id)
        .order("created_at", { ascending: true })

      if (contactsError) {
        console.error("Error loading contacts:", contactsError)
      }

      setClientDetails(clientData)
      setClientContacts(contactsData || [])
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoadingClient(false)
    }
  }

  // Hook para cargar detalles del cliente cuando se abre el diálogo
  useEffect(() => {
    if (clientDialogOpen && oportunidad?.cliente?.id) {
      loadClientDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientDialogOpen, oportunidad?.cliente?.id])

  if (!oportunidad && !loading) {
    return null
  }

  // Calcular días totales (activa o cerrada)
  const calcularDiasTotales = () => {
    if (!oportunidad) return { dias: 0, estaCerrada: false, fechaCierre: null }

    const estadosFinales = ["cerrada", "ganada", "perdida"]
    const estaCerrada = estadosFinales.includes(oportunidad.estado)

    const fechaCreacion = new Date(oportunidad.created_at)
    let fechaFin: Date

    if (estaCerrada && historial.length > 0) {
      // Buscar el PRIMER cambio a estado final (el más antiguo)
      // El historial está ordenado DESC, así que buscamos desde el final
      const historialOrdenado = [...historial].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      const cambioFinal = historialOrdenado.find(
        (item) => estadosFinales.includes(item.estado_nuevo)
      )
      if (cambioFinal) {
        fechaFin = new Date(cambioFinal.created_at)
      } else {
        // Si no está en el historial pero el estado es final, usar fecha actual
        fechaFin = new Date()
      }
    } else {
      // Si está activa, usar fecha actual
      fechaFin = new Date()
    }

    const diffTime = Math.abs(fechaFin.getTime() - fechaCreacion.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return {
      dias: diffDays,
      estaCerrada,
      fechaCierre: estaCerrada ? fechaFin : null,
    }
  }

  // Formatear ubicación (solo provincia y localidad)
  const ubicacion = oportunidad?.cliente
    ? [
        oportunidad.cliente.localidad,
        oportunidad.cliente.provincia,
      ]
        .filter(Boolean)
        .join(", ")
    : "-"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-h-[90vh] overflow-y-auto p-0">
        {/* Header mejorado */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-background to-muted/20 border-b p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-9 w-9 rounded-full hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="space-y-2">
                {oportunidad && (
                  <div className="flex items-center gap-3">
                    <Badge className={`${getEstadoColor(oportunidad.estado)} text-sm px-3 py-1 font-medium`}>
                      {getEstadoLabel(oportunidad.estado)}
                    </Badge>
                    {(() => {
                      const { dias, estaCerrada } = calcularDiasTotales()
                      return (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{dias} {estaCerrada ? "días totales" : "días activa"}</span>
                        </div>
                      )
                    })()}
                  </div>
                )}
                {oportunidad && (
                  <h1 className="text-2xl font-bold text-foreground">{oportunidad.titulo}</h1>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && oportunidad && (isAdmin || oportunidad.created_by === currentUserId) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    onEdit(oportunidad.id)
                  }}
                  className="h-9 text-sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              {onDelete && oportunidad && (isAdmin || oportunidad.created_by === currentUserId) && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    onDelete(oportunidad.id)
                  }}
                  className="h-9 text-sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Cargando información...</p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold">!</span>
              </div>
              <p>{error}</p>
            </div>
          ) : oportunidad ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Columna Izquierda */}
              <div className="lg:col-span-2 space-y-5">
                {/* Información del Cliente */}
                <Card className="shadow-sm hover:shadow-md transition-shadow border-border/50">
                  <CardHeader className="pb-4 bg-gradient-to-br from-muted/30 to-muted/10">
                    <CardTitle className="text-base font-semibold flex items-center gap-2.5 text-foreground">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      Información del Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</Label>
                        <p className="text-base font-semibold mt-1.5 text-foreground">
                          {oportunidad.cliente?.razon_social || oportunidad.cliente?.nombre_establecimiento || "Sin nombre"}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ubicación</Label>
                        <p className="text-base font-medium mt-1.5 text-foreground">{ubicacion}</p>
                      </div>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setClientDialogOpen(true)}
                          className="h-9 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles del Cliente
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Descripción */}
                <Card className="shadow-sm hover:shadow-md transition-shadow border-border/50">
                  <CardHeader className="pb-4 bg-gradient-to-br from-muted/30 to-muted/10">
                    <CardTitle className="text-base font-semibold flex items-center gap-2.5 text-foreground">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      Descripción
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
                        {oportunidad.descripcion || "Sin descripción"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Cambiar Estado */}
                {oportunidad && (
                  <Card className="shadow-sm hover:shadow-md transition-shadow border-border/50 border-l-4 border-l-primary">
                    <CardHeader className="pb-4 bg-gradient-to-br from-primary/5 to-primary/0">
                      <CardTitle className="text-base font-semibold text-foreground">Cambiar Estado</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="nuevo_estado" className="text-sm font-semibold">Nuevo Estado</Label>
                          <Select
                            value={nuevoEstado}
                            onValueChange={setNuevoEstado}
                            disabled={changingEstado}
                          >
                            <SelectTrigger id="nuevo_estado" className="h-10 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ESTADOS_OPORTUNIDAD.map((estado) => (
                                <SelectItem key={estado.value} value={estado.value}>
                                  {estado.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="comentario" className="text-sm font-semibold">Comentario (opcional)</Label>
                          <Textarea
                            id="comentario"
                            value={comentario}
                            onChange={(e) => setComentario(e.target.value)}
                            placeholder="Agregar un comentario sobre el cambio de estado..."
                            disabled={changingEstado}
                            rows={3}
                            className="text-sm resize-none"
                          />
                        </div>

                        <Button
                          onClick={handleCambiarEstado}
                          disabled={changingEstado || nuevoEstado === oportunidad.estado}
                          className="h-10 text-sm font-medium w-full sm:w-auto"
                        >
                          {changingEstado ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            "Cambiar Estado"
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Columna Derecha */}
              <div className="space-y-5">
                {/* Historial */}
                <Card className="shadow-sm hover:shadow-md transition-shadow border-border/50">
                  <CardHeader className="pb-4 bg-gradient-to-br from-muted/30 to-muted/10">
                    <CardTitle className="text-base font-semibold flex items-center gap-2.5 text-foreground">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      Historial
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="space-y-4">
                      {/* Mostrar "Creada" primero (más antiguo arriba) */}
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="w-1 bg-primary rounded-full min-h-[40px] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">Creada</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(oportunidad.created_at)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(() => {
                              const { dias, estaCerrada } = calcularDiasTotales()
                              return estaCerrada
                                ? `Cerrada hace ${dias} días`
                                : `Hace ${dias} días`
                            })()}
                          </p>
                        </div>
                      </div>
                      {/* Mostrar historial después (filtrando el cambio "Inicial -> Nueva") */}
                      {historial.length > 0 && (
                        <div className="space-y-3">
                          {historial
                            .filter((item) => {
                              if ((!item.estado_anterior || item.estado_anterior === "inicial") && item.estado_nuevo === "nueva") {
                                return false
                              }
                              return true
                            })
                            .map((item, index) => (
                              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors">
                                <div className="w-1 bg-muted-foreground/30 rounded-full min-h-[40px] flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <Badge variant="outline" className={`text-xs ${getEstadoColor(item.estado_anterior || "")} border-0`}>
                                      {item.estado_anterior ? getEstadoLabel(item.estado_anterior) : "Inicial"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground font-medium">→</span>
                                    <Badge className={`text-xs ${getEstadoColor(item.estado_nuevo)} border-0`}>
                                      {getEstadoLabel(item.estado_nuevo)}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {formatDate(item.created_at)} - {item.usuario?.full_name || item.usuario?.email || "Usuario desconocido"}
                                  </p>
                                  {item.comentario && (
                                    <p className="text-xs text-muted-foreground mt-2 italic bg-background/50 p-2 rounded border-l-2 border-muted-foreground/30">
                                      &quot;{item.comentario}&quot;
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Producto Asociado */}
                {oportunidad.producto || oportunidad.tipo_producto === "descartables" ? (
                  <Card className="shadow-sm hover:shadow-md transition-shadow border-border/50">
                    <CardHeader className="pb-4 bg-gradient-to-br from-muted/30 to-muted/10">
                      <CardTitle className="text-base font-semibold flex items-center gap-2.5 text-foreground">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        Producto Asociado
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5">
                      {oportunidad.producto ? (
                        <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/20 border border-border/50">
                          {oportunidad.producto.imagen_url && (
                            <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted shadow-sm">
                              <Image
                                src={oportunidad.producto.imagen_url}
                                alt={oportunidad.producto.nombre_equipo}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm mb-1 leading-tight text-foreground">{oportunidad.producto.nombre_equipo}</h3>
                            <p className="text-xs text-muted-foreground mb-2">
                              {oportunidad.producto.marca} {oportunidad.producto.modelo}
                            </p>
                            <Badge variant="outline" className="text-xs font-medium">{oportunidad.producto.rubro}</Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
                          <h3 className="font-semibold text-sm mb-2 text-foreground">Descartables</h3>
                          <Badge variant="outline" className="text-xs font-medium">Descartables</Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* Diálogo anidado para ver detalles del cliente */}
        <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Información del Cliente</DialogTitle>
              <DialogDescription>
                Detalles completos del cliente
              </DialogDescription>
            </DialogHeader>

            {loadingClient ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Cargando información del cliente...</p>
              </div>
            ) : clientDetails ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Razón Social</Label>
                    <p className="text-sm font-medium mt-0.5">{clientDetails.razon_social || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Nombre del Establecimiento</Label>
                    <p className="text-sm font-medium mt-0.5">{clientDetails.nombre_establecimiento || "-"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">CUIT</Label>
                    <p className="text-sm font-medium mt-0.5">{clientDetails.cuit || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Tipo de Establecimiento</Label>
                    <p className="text-sm font-medium mt-0.5">{clientDetails.tipo_establecimiento || "-"}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Dirección</Label>
                  <p className="text-sm font-medium mt-0.5">{clientDetails.direccion || "-"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Localidad</Label>
                    <p className="text-sm font-medium mt-0.5">{clientDetails.localidad || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Provincia</Label>
                    <p className="text-sm font-medium mt-0.5">{clientDetails.provincia || "-"}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Estado</Label>
                  <Badge className={clientDetails.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"} variant="outline">
                    {clientDetails.status === "active" ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                {clientDetails.notas && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Notas</Label>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">{clientDetails.notas}</p>
                  </div>
                )}

                {clientContacts.length > 0 && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">Contactos</Label>
                    <div className="space-y-3">
                      {clientContacts.map((contact) => (
                        <Card key={contact.id}>
                          <CardContent className="p-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs font-medium text-muted-foreground">Tipo de Contacto</Label>
                                <p className="text-sm font-medium mt-0.5">{contact.tipo_contacto}</p>
                              </div>
                              {contact.nombre && (
                                <div>
                                  <Label className="text-xs font-medium text-muted-foreground">Nombre</Label>
                                  <p className="text-sm font-medium mt-0.5">{contact.nombre}</p>
                                </div>
                              )}
                              {contact.email && (
                                <div>
                                  <Label className="text-xs font-medium text-muted-foreground">Email</Label>
                                  <p className="text-sm font-medium mt-0.5">{contact.email}</p>
                                </div>
                              )}
                              {contact.telefono && (
                                <div>
                                  <Label className="text-xs font-medium text-muted-foreground">Teléfono</Label>
                                  <p className="text-sm font-medium mt-0.5">{contact.telefono}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No se pudo cargar la información del cliente</p>
            )}

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setClientDialogOpen(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

