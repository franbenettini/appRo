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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, refreshTrigger, searchQuery, tipoEstablecimientoFilter, provinciaFilter])

  const fetchClients = async () => {
    try {
      setLoading(true)
      
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Obtener TODOS los clientes del usuario con sus contactos (sin paginación para búsqueda completa)
      let baseQuery = supabase
        .from("clients")
        .select(`
          id, 
          razon_social, 
          nombre_establecimiento, 
          tipo_establecimiento, 
          cuit, 
          direccion, 
          localidad, 
          provincia, 
          direccion_lat, 
          direccion_lng, 
          status, 
          created_by, 
          created_at,
          client_contacts (nombre, tipo_contacto, email, telefono)
        `)
        .eq("created_by", user.id)

      // Aplicar filtros de tipo y provincia
      if (tipoEstablecimientoFilter !== "all") {
        baseQuery = baseQuery.eq("tipo_establecimiento", tipoEstablecimientoFilter)
      }

      if (provinciaFilter !== "all") {
        baseQuery = baseQuery.ilike("provincia", `%${provinciaFilter}%`)
      }

      const { data: allClientsData, error: clientsError } = await baseQuery.order("created_at", { ascending: false })

      if (clientsError) {
        console.error("Error fetching clients:", clientsError)
        setClients([])
        setTotalCount(0)
        setTotalPages(0)
        return
      }

      // Filtrar en memoria por búsqueda (más confiable que .or() en Supabase)
      let filteredClients = allClientsData || []
      
      // Debug: verificar cuántos clientes se cargaron
      console.log("Total clientes cargados de DB:", filteredClients.length, "| Búsqueda:", searchQuery || "(vacía)")
      
      if (searchQuery.trim() !== "") {
        const searchLower = searchQuery.trim().toLowerCase()
        const normalizedSearch = searchLower.replace(/-/g, "")
        
        filteredClients = (allClientsData || []).filter((client: any) => {
          // Buscar en campos del cliente
          const razonSocial = (client.razon_social || "").toLowerCase()
          const nombreEstablecimiento = (client.nombre_establecimiento || "").toLowerCase()
          const cuit = (client.cuit || "").toLowerCase()
          const direccion = (client.direccion || "").toLowerCase()
          const localidad = (client.localidad || "").toLowerCase()
          const provincia = (client.provincia || "").toLowerCase()
          
          // Verificar coincidencias en campos del cliente
          const matchesClientFields = 
            razonSocial.includes(searchLower) ||
            nombreEstablecimiento.includes(searchLower) ||
            cuit.includes(searchLower) ||
            cuit.replace(/-/g, "").includes(normalizedSearch) ||
            direccion.includes(searchLower) ||
            localidad.includes(searchLower) ||
            provincia.includes(searchLower)
          
          // Buscar en contactos
          let matchesContacts = false
          if (client.client_contacts && client.client_contacts.length > 0) {
            matchesContacts = client.client_contacts.some((contact: any) => {
              const nombre = (contact.nombre || "").toLowerCase()
              const email = (contact.email || "").toLowerCase()
              const telefono = (contact.telefono || "").toLowerCase()
              const tipoContacto = (contact.tipo_contacto || "").toLowerCase()
              
              return nombre.includes(searchLower) ||
                     email.includes(searchLower) ||
                     telefono.includes(searchLower) ||
                     tipoContacto.includes(searchLower)
            })
          }
          
          return matchesClientFields || matchesContacts
        })
      }

      // Ordenar por fecha de creación (más recientes primero) - solo si no viene ordenado de la DB
      if (filteredClients.length > 0 && !allClientsData?.length) {
        filteredClients.sort((a: any, b: any) => {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return dateB - dateA
        })
      }

      // Calcular total y páginas
      const total = filteredClients.length
      setTotalCount(total)
      setTotalPages(Math.ceil(total / ITEMS_PER_PAGE) || 1)

      // Aplicar paginación
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE
      const paginatedClients = filteredClients.slice(from, to)
      
      // Debug: verificar paginación
      console.log("Total filtrados:", total, "| Página:", currentPage, "| Mostrando:", paginatedClients.length, "clientes (índices", from, "a", to - 1, ")")

      // Procesar contactos
      const clientsWithContacts = paginatedClients.map((client: any) => {
        const contacts = client.client_contacts || []
        return {
          ...client,
          contacts: contacts.map((c: any) => ({
            tipo: c.tipo_contacto,
            nombre: c.nombre || null,
            email: c.email || null,
            telefono: c.telefono || null,
          })),
        }
      })
      
      setClients(clientsWithContacts)
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
            {clients.map((client: any) => {
              const contacts = client.contacts || []
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
                        {contacts.map((contact: any, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                          >
                            {contact.tipo || contact.tipo_contacto || "Contacto"}
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

