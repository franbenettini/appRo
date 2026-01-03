"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit, Eye, TrendingUp, Circle, Clock, CheckCircle2, XCircle, Search, X, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AddOportunidadDialog } from "@/components/add-oportunidad-dialog"
import { ViewOportunidadDialog } from "@/components/view-oportunidad-dialog"

interface Oportunidad {
  id: string
  client_id: string
  titulo: string
  descripcion: string | null
  valor_estimado: number | null
  probabilidad: number
  estado: "nueva" | "en_seguimiento" | "enviar_cotizacion" | "cotizacion_enviada" | "ganada" | "perdida" | "cerrada"
  fecha_cierre_estimada: string | null
  notas: string | null
  producto_id: string | null
  tipo_producto: string | null
  created_at: string
  created_by: string
  cliente?: {
    razon_social: string | null
    nombre_establecimiento: string | null
  }
  producto?: {
    id: string
    nombre_equipo: string
    marca: string
    modelo: string
    rubro: string
  } | null
}

function OportunidadesContent() {
  const searchParams = useSearchParams()
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([])
  const [allOportunidades, setAllOportunidades] = useState<Oportunidad[]>([]) // Para KPIs y filtros
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewingOportunidadId, setViewingOportunidadId] = useState<string | null>(null)
  const [editingOportunidadId, setEditingOportunidadId] = useState<string | null>(null)
  const [preselectedProductoId, setPreselectedProductoId] = useState<string | null>(null)
  const [deletingOportunidadId, setDeletingOportunidadId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [estadoFilter, setEstadoFilter] = useState<string>("all")
  const [productoFilter, setProductoFilter] = useState<string>("all")
  const [kpisExpanded, setKpisExpanded] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchOportunidades()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  useEffect(() => {
    filterOportunidades()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOportunidades, searchQuery, estadoFilter, productoFilter])

  useEffect(() => {
    const productoId = searchParams.get("productoId")
    if (productoId) {
      setPreselectedProductoId(productoId)
      setDialogOpen(true)
    }
  }, [searchParams])

  const fetchOportunidades = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)

      // Verificar si el usuario es admin
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

      const userIsAdmin = !userError && userData?.role === "admin"
      setIsAdmin(userIsAdmin)

      // Si es admin, mostrar todas las oportunidades; si no, solo las propias
      let query = supabase
        .from("oportunidades")
        .select(`
          *,
          producto:productos(id, nombre_equipo, marca, modelo, rubro),
          created_by
        `)
        .order("created_at", { ascending: false })

      if (!userIsAdmin) {
        query = query.eq("created_by", user.id)
      }

      const { data: oportunidadesData, error } = await query

      if (error) {
        console.error("Error fetching oportunidades:", error)
        return
      }

      // Obtener datos de los clientes
      if (oportunidadesData && oportunidadesData.length > 0) {
        const clientIds = oportunidadesData.map(o => o.client_id)
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, razon_social, nombre_establecimiento")
          .in("id", clientIds)

        if (!clientsError && clientsData) {
          const clientsMap = new Map(clientsData.map(c => [c.id, c]))
          const oportunidadesConCliente = oportunidadesData.map(op => ({
            ...op,
            cliente: clientsMap.get(op.client_id) || { razon_social: null, nombre_establecimiento: null }
          }))
          setAllOportunidades(oportunidadesConCliente)
        } else {
          setAllOportunidades(oportunidadesData)
        }
      } else {
        setAllOportunidades([])
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      nueva: "Nueva",
      en_seguimiento: "En Seguimiento",
      enviar_cotizacion: "Enviar Cotización",
      cotizacion_enviada: "Cotización Enviada",
      ganada: "Ganada",
      perdida: "Perdida",
      cerrada: "Cerrada",
    }
    return labels[estado] || estado
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

  const handleView = (oportunidadId: string) => {
    setViewingOportunidadId(oportunidadId)
  }

  const handleEdit = (oportunidadId: string) => {
    const oportunidad = allOportunidades.find(op => op.id === oportunidadId)
    if (!oportunidad || !canModifyOportunidad(oportunidad)) {
      alert("No tienes permisos para editar esta oportunidad")
      return
    }
    setEditingOportunidadId(oportunidadId)
    setDialogOpen(true)
  }

  const handleDelete = (oportunidadId: string) => {
    const oportunidad = allOportunidades.find(op => op.id === oportunidadId)
    if (!oportunidad || !canModifyOportunidad(oportunidad)) {
      alert("No tienes permisos para eliminar esta oportunidad")
      return
    }
    setDeletingOportunidadId(oportunidadId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingOportunidadId) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const oportunidad = allOportunidades.find(op => op.id === deletingOportunidadId)
      if (!oportunidad || !canModifyOportunidad(oportunidad)) {
        alert("No tienes permisos para eliminar esta oportunidad")
        return
      }

      let deleteQuery = supabase
        .from("oportunidades")
        .delete()
        .eq("id", deletingOportunidadId)

      // Si no es admin, solo puede eliminar sus propias oportunidades
      if (!isAdmin) {
        deleteQuery = deleteQuery.eq("created_by", user.id)
      }

      const { error } = await deleteQuery

      if (error) {
        console.error("Error al eliminar oportunidad:", error)
        return
      }

      setDeleteDialogOpen(false)
      setDeletingOportunidadId(null)
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingOportunidadId(null)
      setRefreshTrigger(prev => prev + 1)
    }
  }

  const filterOportunidades = () => {
    let filtered = [...allOportunidades]

    // Filtro por búsqueda (título, cliente)
    if (searchQuery.trim() !== "") {
      const searchLower = searchQuery.trim().toLowerCase()
      filtered = filtered.filter((op) => {
        const titulo = (op.titulo || "").toLowerCase()
        const clienteNombre = getClientDisplayName(op.cliente).toLowerCase()
        return titulo.includes(searchLower) || clienteNombre.includes(searchLower)
      })
    }

    // Filtro por estado
    if (estadoFilter !== "all") {
      filtered = filtered.filter((op) => op.estado === estadoFilter)
    }

    // Filtro por producto
    if (productoFilter !== "all") {
      if (productoFilter === "descartables") {
        filtered = filtered.filter((op) => op.tipo_producto === "descartables")
      } else {
        filtered = filtered.filter((op) => op.producto_id === productoFilter)
      }
    }

    setOportunidades(filtered)
  }

  const getClientDisplayName = (cliente: { razon_social: string | null; nombre_establecimiento: string | null } | undefined) => {
    if (!cliente) return "Cliente desconocido"
    return cliente.razon_social || cliente.nombre_establecimiento || "Sin nombre"
  }

  // Verificar si el usuario puede editar/eliminar una oportunidad
  const canModifyOportunidad = (oportunidad: Oportunidad) => {
    if (!currentUserId) return false
    return isAdmin || oportunidad.created_by === currentUserId
  }

  // Calcular KPIs
  const kpis = {
    total: allOportunidades.length,
    nuevas: allOportunidades.filter((op) => op.estado === "nueva").length,
    enSeguimiento: allOportunidades.filter((op) => op.estado === "en_seguimiento").length,
    ganadas: allOportunidades.filter((op) => op.estado === "ganada").length,
    perdidas: allOportunidades.filter((op) => op.estado === "perdida").length,
  }

  const totalFinalizadas = kpis.ganadas + kpis.perdidas
  const tasaExito = (kpis.ganadas + kpis.perdidas) > 0 
    ? Math.round((kpis.ganadas / (kpis.ganadas + kpis.perdidas)) * 100) || 0
    : 0

  const hasActiveFilters = searchQuery.trim() !== "" || estadoFilter !== "all" || productoFilter !== "all"

  const clearFilters = () => {
    setSearchQuery("")
    setEstadoFilter("all")
    setProductoFilter("all")
  }

  // Obtener productos únicos para el filtro
  const productosUnicos = Array.from(
    new Set(
      allOportunidades
        .filter((op) => op.producto)
        .map((op) => JSON.stringify({ id: op.producto!.id, nombre: `${op.producto!.nombre_equipo} - ${op.producto!.marca} ${op.producto!.modelo}` }))
    )
  ).map((str) => JSON.parse(str))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando oportunidades...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Oportunidades</h1>
          <p className="text-muted-foreground">
            Gestiona tus oportunidades de venta
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Oportunidad
        </Button>
      </div>

      {/* KPIs colapsables */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-sm font-semibold">Métricas</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setKpisExpanded(!kpisExpanded)}
            className="h-8 flex items-center gap-2"
          >
            {kpisExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Ocultar métricas
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Ver métricas
              </>
            )}
          </Button>
        </div>
        
        {kpisExpanded && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{kpis.total}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nuevas</p>
                      <p className="text-2xl font-bold">{kpis.nuevas}</p>
                    </div>
                    <Circle className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">En Seguimiento</p>
                      <p className="text-2xl font-bold">{kpis.enSeguimiento}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Ganadas</p>
                      <p className="text-2xl font-bold">{kpis.ganadas}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Perdidas</p>
                      <p className="text-2xl font-bold">{kpis.perdidas}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tasa de Éxito</p>
                      <p className="text-2xl font-bold">{tasaExito}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Filtros compactos */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="nueva">Nueva</SelectItem>
              <SelectItem value="en_seguimiento">En Seguimiento</SelectItem>
              <SelectItem value="enviar_cotizacion">Enviar Cotización</SelectItem>
              <SelectItem value="cotizacion_enviada">Cotización Enviada</SelectItem>
              <SelectItem value="ganada">Ganada</SelectItem>
              <SelectItem value="perdida">Perdida</SelectItem>
              <SelectItem value="cerrada">Cerrada</SelectItem>
            </SelectContent>
        </Select>
        <Select value={productoFilter} onValueChange={setProductoFilter}>
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="Producto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los productos</SelectItem>
            <SelectItem value="descartables">Descartables</SelectItem>
            {productosUnicos.map((producto) => (
              <SelectItem key={producto.id} value={producto.id}>
                {producto.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="h-9 flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>

      {oportunidades.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <p className="text-muted-foreground">No hay oportunidades creadas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {oportunidades.map((oportunidad) => {
            // Determinar qué mostrar para el producto
            let productoDisplay = null
            if (oportunidad.producto) {
              productoDisplay = {
                nombre: `${oportunidad.producto.nombre_equipo} - ${oportunidad.producto.marca} ${oportunidad.producto.modelo}`,
                rubro: oportunidad.producto.rubro,
              }
            } else if (oportunidad.tipo_producto === "descartables") {
              productoDisplay = {
                nombre: "Descartables",
                rubro: "Descartables",
              }
            }

            return (
              <Card key={oportunidad.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Header con Estado */}
                  <div className="flex items-start justify-between mb-4">
                    <Badge className={getEstadoColor(oportunidad.estado)}>
                      {getEstadoLabel(oportunidad.estado)}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {canModifyOportunidad(oportunidad) ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleView(oportunidad.id)}
                            title="Ver oportunidad"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(oportunidad.id)}
                            title="Editar oportunidad"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(oportunidad.id)}
                            title="Eliminar oportunidad"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Título */}
                  <h3 className="text-xl font-bold mb-3 line-clamp-2">
                    {oportunidad.titulo}
                  </h3>

                  {/* Cliente */}
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Cliente</p>
                    <p className="text-sm font-medium">
                      {getClientDisplayName(oportunidad.cliente)}
                    </p>
                  </div>

                  {/* Producto */}
                  {productoDisplay && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-2">Producto</p>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {productoDisplay.nombre}
                      </Badge>
                    </div>
                  )}

                  {/* Fecha de creación */}
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Creado: {formatDate(oportunidad.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {viewingOportunidadId && (
        <ViewOportunidadDialog
          open={!!viewingOportunidadId}
          onOpenChange={(open) => {
            if (!open) {
              setViewingOportunidadId(null)
              // Actualizar la lista cuando se cierra el diálogo
              setRefreshTrigger(prev => prev + 1)
            }
          }}
          oportunidadId={viewingOportunidadId}
          onEdit={(id) => {
            setViewingOportunidadId(null)
            setEditingOportunidadId(id)
            setDialogOpen(true)
          }}
          onDelete={(id) => {
            setViewingOportunidadId(null)
            setDeletingOportunidadId(id)
            setDeleteDialogOpen(true)
          }}
          onSuccess={async () => {
            // Actualizar solo la oportunidad específica en la lista sin recargar todo
            // Esto se ejecuta en segundo plano sin afectar el popup abierto
            if (viewingOportunidadId) {
              try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                // Obtener la oportunidad actualizada
                const { data: oportunidadData, error } = await supabase
                  .from("oportunidades")
                  .select(`
                    *,
                    producto:productos(id, nombre_equipo, marca, modelo, rubro),
                    created_by
                  `)
                  .eq("id", viewingOportunidadId)
                  .single()

                if (!error && oportunidadData) {
                  // Obtener datos del cliente
                  const { data: clienteData } = await supabase
                    .from("clients")
                    .select("id, razon_social, nombre_establecimiento")
                    .eq("id", oportunidadData.client_id)
                    .single()

                  const oportunidadActualizada = {
                    ...oportunidadData,
                    cliente: clienteData || { razon_social: null, nombre_establecimiento: null }
                  }

                  // Actualizar solo esta oportunidad en el estado local sin causar re-render del popup
                  setAllOportunidades(prev => prev.map(op => 
                    op.id === viewingOportunidadId ? oportunidadActualizada : op
                  ))
                }
              } catch (error) {
                console.error("Error updating oportunidad:", error)
              }
            }
          }}
        />
      )}

      <AddOportunidadDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          handleDialogClose(open)
          if (!open) {
            setPreselectedProductoId(null)
          }
        }}
        oportunidadId={editingOportunidadId}
        clientId={null}
        productoId={preselectedProductoId}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la oportunidad de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingOportunidadId(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function OportunidadesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando oportunidades...</p>
      </div>
    }>
      <OportunidadesContent />
    </Suspense>
  )
}
