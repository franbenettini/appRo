"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Image as ImageIcon, Plus } from "lucide-react"
import Image from "next/image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

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
}

const RUBROS = [
  "Laboratorio",
  "Imágenes",
  "Monitoreo",
  "Terapia",
  "Diagnóstico",
  "Otro",
]

export default function CatalogoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState<Producto[]>([])
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([])
  const [rubroFilter, setRubroFilter] = useState<string>("all")
  const [marcaFilter, setMarcaFilter] = useState<string>("all")
  const [marcas, setMarcas] = useState<string[]>([])

  useEffect(() => {
    fetchProductos()
  }, [])

  useEffect(() => {
    filterProductos()
  }, [productos, rubroFilter, marcaFilter])

  const fetchProductos = async () => {
    try {
      setLoading(true)
      const { data: productosData, error } = await supabase
        .from("productos")
        .select("*")
        .eq("activo", true)
        .order("nombre_equipo", { ascending: true })

      if (error) {
        console.error("Error fetching productos:", error)
        return
      }

      const productosActivos = productosData || []
      setProductos(productosActivos)

      // Extraer marcas únicas
      const marcasUnicas = Array.from(
        new Set(productosActivos.map((p) => p.marca).filter(Boolean))
      ).sort()
      setMarcas(marcasUnicas)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterProductos = () => {
    let filtered = [...productos]

    if (rubroFilter !== "all") {
      filtered = filtered.filter((p) => p.rubro === rubroFilter)
    }

    if (marcaFilter !== "all") {
      filtered = filtered.filter((p) => p.marca === marcaFilter)
    }

    setFilteredProductos(filtered)
  }

  const handleAgregarAOportunidad = (productoId: string) => {
    router.push(`/dashboard/oportunidades?productoId=${productoId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando catálogo...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Catálogo de Productos</h1>
        <p className="text-muted-foreground">
          Explora los productos disponibles y agrégalos a tus oportunidades
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filtrar por Rubro</label>
              <Select value={rubroFilter} onValueChange={setRubroFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los rubros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los rubros</SelectItem>
                  {RUBROS.map((rubro) => (
                    <SelectItem key={rubro} value={rubro}>
                      {rubro}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Filtrar por Marca</label>
              <Select value={marcaFilter} onValueChange={setMarcaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las marcas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las marcas</SelectItem>
                  {marcas.map((marca) => (
                    <SelectItem key={marca} value={marca}>
                      {marca}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Productos */}
      {filteredProductos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {productos.length === 0
                ? "No hay productos disponibles"
                : "No se encontraron productos con los filtros seleccionados"}
            </p>
            {(rubroFilter !== "all" || marcaFilter !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setRubroFilter("all")
                  setMarcaFilter("all")
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredProductos.length}{" "}
              {filteredProductos.length === 1 ? "producto encontrado" : "productos encontrados"}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProductos.map((producto) => (
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
                    <Button
                      onClick={() => handleAgregarAOportunidad(producto.id)}
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar a Oportunidad
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

