"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2, Loader2, FileText, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
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
import { AddProductoDialog } from "@/components/add-producto-dialog"
import { formatDate } from "@/lib/utils"

interface Producto {
  id: string
  marca: string
  modelo: string
  nombre_equipo: string
  rubro: string
  descripcion: string | null
  imagen_url: string | null
  especificaciones_pdf_url: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export default function ProductosPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState<Producto[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProductoId, setEditingProductoId] = useState<string | null>(null)
  const [deletingProductoId, setDeletingProductoId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single()

        if (userError || userData?.role !== "admin") {
          router.push("/dashboard")
          return
        }

        setIsAdmin(true)
        await fetchProductos()
      } catch (error) {
        console.error("Error:", error)
        router.push("/dashboard")
      } finally {
        setLoading(false)
      }
    }

    checkAdminRole()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase, refreshTrigger])

  const fetchProductos = async () => {
    try {
      const { data: productosData, error } = await supabase
        .from("productos")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching productos:", error)
        return
      }

      setProductos(productosData || [])
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleEdit = (productoId: string) => {
    setEditingProductoId(productoId)
    setDialogOpen(true)
  }

  const handleDelete = (productoId: string) => {
    setDeletingProductoId(productoId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingProductoId) return

    try {
      const { error } = await supabase
        .from("productos")
        .delete()
        .eq("id", deletingProductoId)

      if (error) {
        console.error("Error al eliminar producto:", error)
        return
      }

      setDeleteDialogOpen(false)
      setDeletingProductoId(null)
      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingProductoId(null)
      setRefreshTrigger(prev => prev + 1)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona los productos y equipos disponibles
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {productos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No hay productos registrados</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Primer Producto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {productos.length} {productos.length === 1 ? "producto" : "productos"} registrado{productos.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productos.map((producto) => (
              <Card key={producto.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48 bg-gray-100">
                  {producto.imagen_url ? (
                    <>
                      <Image
                        src={producto.imagen_url}
                        alt={producto.nombre_equipo}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-white/90 text-primary backdrop-blur-sm">
                          {producto.rubro}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{producto.nombre_equipo}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {producto.marca} - {producto.modelo}
                  </p>
                  {producto.descripcion && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {producto.descripcion}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(producto.id)}
                        title="Editar producto"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(producto.id)}
                        title="Eliminar producto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {producto.especificaciones_pdf_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(producto.especificaciones_pdf_url!, "_blank")}
                          title="Ver especificaciones técnicas"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        producto.activo
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {producto.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AddProductoDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        productoId={editingProductoId}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el producto de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingProductoId(null)}>
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

