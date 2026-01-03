"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ClientsFiltersProps {
  searchQuery: string
  tipoEstablecimientoFilter: string
  provinciaFilter: string
  onSearchChange: (value: string) => void
  onTipoEstablecimientoFilterChange: (value: string) => void
  onProvinciaFilterChange: (value: string) => void
  onClearFilters: () => void
}

const TIPOS_ESTABLECIMIENTO = [
  "Laboratorio",
  "Clínica/Hospital",
  "Centro de Imágenes",
  "Geriátrico",
  "Ginecología",
  "Ecografía",
  "Veterinario",
  "Industria",
]

const PROVINCIAS_ARGENTINA = [
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
]

export function ClientsFilters({
  searchQuery,
  tipoEstablecimientoFilter,
  provinciaFilter,
  onSearchChange,
  onTipoEstablecimientoFilterChange,
  onProvinciaFilterChange,
  onClearFilters,
}: ClientsFiltersProps) {
  const hasActiveFilters = 
    searchQuery.trim() !== "" || 
    tipoEstablecimientoFilter !== "all" ||
    provinciaFilter !== "all"

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, CUIT, localidad, provincia, contacto, email, teléfono..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Establecimiento</label>
          <Select value={tipoEstablecimientoFilter} onValueChange={onTipoEstablecimientoFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {TIPOS_ESTABLECIMIENTO.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Provincia</label>
          <Select value={provinciaFilter} onValueChange={onProvinciaFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las provincias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las provincias</SelectItem>
              {PROVINCIAS_ARGENTINA.map((provincia) => (
                <SelectItem key={provincia} value={provincia}>
                  {provincia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

