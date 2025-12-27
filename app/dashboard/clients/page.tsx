"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { AddClientDialog } from "@/components/add-client-dialog"
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
import { ClientsList } from "@/components/clients-list"
import { ClientsFilters } from "@/components/clients-filters"

export default function ClientsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [tipoEstablecimientoFilter, setTipoEstablecimientoFilter] = useState("all")
  const [provinciaFilter, setProvinciaFilter] = useState("all")
  const supabase = createClient()

  const handleEdit = (clientId: string) => {
    setEditingClientId(clientId)
    setDialogOpen(true)
  }

  const handleDelete = (clientId: string) => {
    setDeletingClientId(clientId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingClientId) return

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", deletingClientId)

      if (error) {
        console.error("Error al eliminar cliente:", error)
        return
      }

      setDeleteDialogOpen(false)
      setDeletingClientId(null)
      setRefreshTrigger(prev => prev + 1) // Refrescar la lista
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingClientId(null)
      setRefreshTrigger(prev => prev + 1) // Refrescar la lista
    }
  }

  const handleClearFilters = () => {
    setSearchQuery("")
    setTipoEstablecimientoFilter("all")
    setProvinciaFilter("all")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona tus clientes y contactos
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Cliente
        </Button>
      </div>

      <ClientsFilters
        searchQuery={searchQuery}
        tipoEstablecimientoFilter={tipoEstablecimientoFilter}
        provinciaFilter={provinciaFilter}
        onSearchChange={setSearchQuery}
        onTipoEstablecimientoFilterChange={setTipoEstablecimientoFilter}
        onProvinciaFilterChange={setProvinciaFilter}
        onClearFilters={handleClearFilters}
      />

      <ClientsList
        onEdit={handleEdit}
        onDelete={handleDelete}
        refreshTrigger={refreshTrigger}
        searchQuery={searchQuery}
        tipoEstablecimientoFilter={tipoEstablecimientoFilter}
        provinciaFilter={provinciaFilter}
      />

      <AddClientDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        clientId={editingClientId}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el cliente y todos sus contactos de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingClientId(null)}>
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
