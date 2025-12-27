"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AddOportunidadDialog } from "@/components/add-oportunidad-dialog"

interface Oportunidad {
  id: string
  client_id: string
  titulo: string
  descripcion: string | null
  valor_estimado: number | null
  probabilidad: number
  estado: "nueva" | "en_seguimiento" | "ganada" | "perdida" | "cerrada"
  fecha_cierre_estimada: string | null
  notas: string | null
  created_at: string
  cliente?: {
    razon_social: string | null
    nombre_establecimiento: string | null
  }
}

export default function OportunidadesPage() {
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOportunidadId, setEditingOportunidadId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    fetchOportunidades()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  const fetchOportunidades = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: oportunidadesData, error } = await supabase
        .from("oportunidades")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })

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
          setOportunidades(oportunidadesConCliente)
        } else {
          setOportunidades(oportunidadesData)
        }
      } else {
        setOportunidades([])
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
      ganada: "bg-green-100 text-green-800",
      perdida: "bg-red-100 text-red-800",
      cerrada: "bg-gray-100 text-gray-800",
    }
    return colors[estado] || "bg-gray-100 text-gray-800"
  }

  const handleEdit = (oportunidadId: string) => {
    setEditingOportunidadId(oportunidadId)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingOportunidadId(null)
      setRefreshTrigger(prev => prev + 1)
    }
  }

  const getClientDisplayName = (cliente: { razon_social: string | null; nombre_establecimiento: string | null } | undefined) => {
    if (!cliente) return "Cliente desconocido"
    return cliente.razon_social || cliente.nombre_establecimiento || "Sin nombre"
  }

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

      {oportunidades.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <p className="text-muted-foreground">No hay oportunidades creadas</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor Estimado</TableHead>
                <TableHead>Probabilidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Cierre</TableHead>
                <TableHead className="w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {oportunidades.map((oportunidad) => (
                <TableRow key={oportunidad.id}>
                  <TableCell className="font-medium">{oportunidad.titulo}</TableCell>
                  <TableCell>{getClientDisplayName(oportunidad.cliente)}</TableCell>
                  <TableCell>
                    {oportunidad.valor_estimado
                      ? `$${oportunidad.valor_estimado.toLocaleString("es-AR")}`
                      : "-"}
                  </TableCell>
                  <TableCell>{oportunidad.probabilidad}%</TableCell>
                  <TableCell>
                    <Badge className={getEstadoColor(oportunidad.estado)}>
                      {getEstadoLabel(oportunidad.estado)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDate(oportunidad.fecha_cierre_estimada)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(oportunidad.id)}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddOportunidadDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        oportunidadId={editingOportunidadId}
        clientId={null}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />
    </div>
  )
}

