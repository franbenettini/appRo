"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Client {
  id: string
  razon_social: string | null
  nombre_establecimiento: string | null
  tipo_establecimiento: string | null
  cuit: string | null
  direccion: string | null
  localidad: string | null
  provincia: string | null
  direccion_lat: number | null
  direccion_lng: number | null
  status: "active" | "inactive"
  created_at: string
}

interface ClientContact {
  id: string
  tipo_contacto: string
  email: string | null
  telefono: string | null
}

interface ClientsListProps {
  onEdit: (clientId: string) => void
  onDelete: (clientId: string) => void
  refreshTrigger: number
  searchQuery?: string
  tipoEstablecimientoFilter?: string
  provinciaFilter?: string
}

const ITEMS_PER_PAGE = 10

export function ClientsList({ 
  onEdit, 
  onDelete, 
  refreshTrigger,
  searchQuery = "",
  tipoEstablecimientoFilter = "all",
  provinciaFilter = "all"
}: ClientsListProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [clientContacts, setClientContacts] = useState<Record<string, ClientContact[]>>({})
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const supabase = createClient()

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, tipoEstablecimientoFilter, provinciaFilter])

  useEffect(() => {
    fetchClients()
  }, [currentPage, refreshTrigger, searchQuery, tipoEstablecimientoFilter, provinciaFilter])

  const fetchClients = async () => {
    try {
      setLoading(true)
      
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Construir query base
      let query = supabase
        .from("clients")
        .select("id, razon_social, nombre_establecimiento, tipo_establecimiento, cuit, direccion, localidad, provincia, direccion_lat, direccion_lng, status, created_by, created_at", { count: "exact" })
        .eq("created_by", user.id)

      // Aplicar filtros
      if (tipoEstablecimientoFilter !== "all") {
        query = query.eq("tipo_establecimiento", tipoEstablecimientoFilter)
      }

      if (provinciaFilter !== "all") {
        query = query.ilike("provincia", `%${provinciaFilter}%`)
      }

      // Aplicar búsqueda (buscar en razón social, nombre, CUIT y dirección)
      if (searchQuery.trim() !== "") {
        const searchTerm = `%${searchQuery.trim()}%`
        query = query.or(
          `razon_social.ilike.${searchTerm},nombre_establecimiento.ilike.${searchTerm},cuit.ilike.${searchTerm},direccion.ilike.${searchTerm},localidad.ilike.${searchTerm}`
        )
      }

      // Obtener el total de clientes para calcular páginas
      const { count, error: countError } = await query

      if (countError) {
        console.error("Error counting clients:", countError)
        return
      }

      const total = count || 0
      setTotalCount(total)
      setTotalPages(Math.ceil(total / ITEMS_PER_PAGE))

      // Obtener clientes del usuario con paginación
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      // Reconstruir query para obtener los datos
      let dataQuery = supabase
        .from("clients")
        .select("id, razon_social, nombre_establecimiento, tipo_establecimiento, cuit, direccion, localidad, provincia, direccion_lat, direccion_lng, status, created_by, created_at")
        .eq("created_by", user.id)

      // Aplicar los mismos filtros
      if (tipoEstablecimientoFilter !== "all") {
        dataQuery = dataQuery.eq("tipo_establecimiento", tipoEstablecimientoFilter)
      }

      if (provinciaFilter !== "all") {
        dataQuery = dataQuery.ilike("provincia", `%${provinciaFilter}%`)
      }

      if (searchQuery.trim() !== "") {
        const searchTerm = `%${searchQuery.trim()}%`
        dataQuery = dataQuery.or(
          `razon_social.ilike.${searchTerm},nombre_establecimiento.ilike.${searchTerm},cuit.ilike.${searchTerm},direccion.ilike.${searchTerm},localidad.ilike.${searchTerm}`
        )
      }

      const { data: clientsData, error: clientsError } = await dataQuery
        .order("created_at", { ascending: false })
        .range(from, to)

      if (clientsError) {
        console.error("Error fetching clients:", clientsError)
        return
      }

      setClients(clientsData || [])

      // Obtener contactos de los clientes
      if (clientsData && clientsData.length > 0) {
        const clientIds = clientsData.map(c => c.id)
        const { data: contactsData, error: contactsError } = await supabase
          .from("client_contacts")
          .select("*")
          .in("client_id", clientIds)

        if (!contactsError && contactsData) {
          const contactsMap: Record<string, ClientContact[]> = {}
          contactsData.forEach(contact => {
            if (!contactsMap[contact.client_id]) {
              contactsMap[contact.client_id] = []
            }
            contactsMap[contact.client_id].push(contact)
          })
          setClientContacts(contactsMap)
        }
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Activo",
      inactive: "Inactivo",
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando clientes...</p>
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-muted-foreground">No hay clientes</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Razón Social</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo de Establecimiento</TableHead>
              <TableHead>Contactos</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => {
              const contacts = clientContacts[client.id] || []
              const displayName = client.razon_social || "Sin razón social"
              
              return (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{displayName}</TableCell>
                  <TableCell>
                    {client.nombre_establecimiento || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.tipo_establecimiento || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contacts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {contacts.map((contact) => (
                          <span
                            key={contact.id}
                            className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                          >
                            {contact.tipo_contacto}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin contactos</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(client.provincia || client.localidad) ? (
                      <div className="flex flex-col gap-0.5 text-sm">
                        {client.provincia ? (
                          <span className="font-medium">
                            {client.provincia}
                          </span>
                        ) : null}
                        {client.localidad ? (
                          <span className={client.provincia ? "text-muted-foreground" : ""}>
                            {client.localidad}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                        client.status
                      )}`}
                    >
                      {getStatusLabel(client.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(client.id)}
                        title="Editar cliente"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(client.id)}
                        title="Eliminar cliente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount} clientes
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Mostrar solo algunas páginas alrededor de la actual
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="w-10"
                      onClick={() => setCurrentPage(page)}
                      disabled={loading}
                    >
                      {page}
                    </Button>
                  )
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2">...</span>
                }
                return null
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

