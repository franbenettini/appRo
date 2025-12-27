"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Eye, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
import { AddRutaDialog } from "@/components/add-ruta-dialog"
import { RutaDetalleDialog } from "@/components/ruta-detalle-dialog"

interface Ruta {
  id: string
  nombre: string
  fecha_inicio: string
  descripcion: string | null
  fecha_finalizacion: string | null
  estado: "planificada" | "finalizada"
  created_at: string
  cantidad_clientes?: number
  clientes_visitados?: number
}

export default function VisitasPage() {
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRutaId, setEditingRutaId] = useState<string | null>(null)
  const [viewingRutaId, setViewingRutaId] = useState<string | null>(null)
  const [deletingRutaId, setDeletingRutaId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    fetchRutas()
  }, [refreshTrigger])

  const fetchRutas = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Intentar primero con fecha_inicio, si falla intentar con fecha (nombre antiguo)
      let rutasData: any[] | null = null
      let error: any = null
      
      const { data: rutasDataNew, error: errorNew } = await supabase
        .from("rutas")
        .select("*")
        .eq("created_by", user.id)
        .order("fecha_inicio", { ascending: false })
      
      if (errorNew && (errorNew.message?.includes("fecha_inicio") || errorNew.message?.includes("column"))) {
        // Si falla, intentar con el nombre antiguo
        const { data: rutasDataOld, error: errorOld } = await supabase
          .from("rutas")
          .select("*")
          .eq("created_by", user.id)
          .order("fecha", { ascending: false })
        
        if (errorOld) {
          console.error("Error fetching rutas:", errorOld)
          return
        }
        
        rutasData = rutasDataOld
        error = null
      } else {
        rutasData = rutasDataNew
        error = errorNew
      }

      if (error) {
        console.error("Error fetching rutas:", error)
        return
      }

      // Mapear fecha a fecha_inicio para compatibilidad
      const rutasMapeadas = (rutasData || []).map((ruta: any) => ({
        ...ruta,
        fecha_inicio: ruta.fecha_inicio || ruta.fecha
      }))

      // Obtener cantidad de clientes y visitados por ruta
      if (rutasMapeadas && rutasMapeadas.length > 0) {
        const rutaIds = rutasMapeadas.map(r => r.id)
        const { data: rutaClientesData, error: rutaClientesError } = await supabase
          .from("ruta_clientes")
          .select("ruta_id, visitado")
          .in("ruta_id", rutaIds)

        if (!rutaClientesError && rutaClientesData) {
          const cantidadPorRuta: Record<string, number> = {}
          const visitadosPorRuta: Record<string, number> = {}

          rutaClientesData.forEach((rc) => {
            cantidadPorRuta[rc.ruta_id] = (cantidadPorRuta[rc.ruta_id] || 0) + 1
            if (rc.visitado) {
              visitadosPorRuta[rc.ruta_id] = (visitadosPorRuta[rc.ruta_id] || 0) + 1
            }
          })

          const rutasConCantidad = rutasMapeadas.map(ruta => ({
            ...ruta,
            cantidad_clientes: cantidadPorRuta[ruta.id] || 0,
            clientes_visitados: visitadosPorRuta[ruta.id] || 0
          }))

          setRutas(rutasConCantidad)
        } else {
          setRutas(rutasMapeadas.map(ruta => ({ 
            ...ruta, 
            cantidad_clientes: 0,
            clientes_visitados: 0
          })))
        }
      } else {
        setRutas([])
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      planificada: "Planificada",
      finalizada: "Finalizada",
    }
    return labels[estado] || estado
  }

  const getEstadoColor = (estado: string) => {
    const colors: Record<string, string> = {
      planificada: "bg-blue-100 text-blue-800",
      finalizada: "bg-green-100 text-green-800",
    }
    return colors[estado] || "bg-gray-100 text-gray-800"
  }

  const handleEdit = (rutaId: string) => {
    setEditingRutaId(rutaId)
    setDialogOpen(true)
  }

  const handleView = (rutaId: string) => {
    setViewingRutaId(rutaId)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingRutaId(null)
      setRefreshTrigger(prev => prev + 1)
    }
  }

  const handleDelete = (rutaId: string) => {
    setDeletingRutaId(rutaId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingRutaId) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Eliminar la ruta (esto debería eliminar en cascada los ruta_clientes según la migración SQL)
      const { error } = await supabase
        .from("rutas")
        .delete()
        .eq("id", deletingRutaId)
        .eq("created_by", user.id)

      if (error) {
        console.error("Error al eliminar ruta:", error)
        return
      }

      setDeleteDialogOpen(false)
      setDeletingRutaId(null)
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error("Error:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando rutas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visitas</h1>
          <p className="text-muted-foreground">
            Gestiona tus rutas y visitas a clientes
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Ruta
        </Button>
      </div>

      {rutas.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <p className="text-muted-foreground">No hay rutas creadas</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cantidad de Clientes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[140px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rutas.map((ruta) => (
                <TableRow key={ruta.id}>
                  <TableCell className="font-medium">{ruta.nombre}</TableCell>
                  <TableCell>
                    {ruta.fecha_finalizacion ? (
                      <span>
                        {formatDate(ruta.fecha_inicio)} - {formatDate(ruta.fecha_finalizacion)}
                      </span>
                    ) : (
                      formatDate(ruta.fecha_inicio)
                    )}
                  </TableCell>
                  <TableCell>
                    {ruta.cantidad_clientes === 0 ? (
                      "Sin clientes"
                    ) : ruta.clientes_visitados && ruta.clientes_visitados > 0 ? (
                      <span>
                        {ruta.clientes_visitados} de {ruta.cantidad_clientes} visitado{ruta.clientes_visitados === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {ruta.cantidad_clientes} {ruta.cantidad_clientes === 1 ? "cliente" : "clientes"} (0 visitados)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getEstadoColor(ruta.estado)}>
                      {getEstadoLabel(ruta.estado)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleView(ruta.id)}
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(ruta.id)}
                        title="Editar ruta"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(ruta.id)}
                        title="Eliminar ruta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddRutaDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        rutaId={editingRutaId}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />

      {viewingRutaId && (
        <RutaDetalleDialog
          open={!!viewingRutaId}
          onOpenChange={(open) => {
            if (!open) setViewingRutaId(null)
          }}
          rutaId={viewingRutaId}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la ruta completa y todos sus clientes asociados de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingRutaId(null)}>
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

