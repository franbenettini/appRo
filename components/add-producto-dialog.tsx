"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react"

const productoSchema = z.object({
  marca: z.string().min(1, "La marca es requerida").max(100, "La marca no puede exceder 100 caracteres"),
  modelo: z.string().min(1, "El modelo es requerido").max(100, "El modelo no puede exceder 100 caracteres"),
  nombre_equipo: z.string().min(1, "El nombre del equipo es requerido").max(200, "El nombre no puede exceder 200 caracteres"),
  rubro: z.string().min(1, "El rubro es requerido"),
  descripcion: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional(),
  activo: z.boolean().default(true),
})

type ProductoFormValues = z.infer<typeof productoSchema>

interface AddProductoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productoId?: string | null
  onSuccess?: () => void
}

const RUBROS = [
  "Laboratorio",
  "Imágenes",
  "Monitoreo",
  "Terapia",
  "Diagnóstico",
  "Otro",
]

export function AddProductoDialog({ open, onOpenChange, productoId, onSuccess }: AddProductoDialogProps) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imagenFile, setImagenFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [currentImagenUrl, setCurrentImagenUrl] = useState<string | null>(null)
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null)
  const imagenInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const isEditing = !!productoId

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProductoFormValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: {
      marca: "",
      modelo: "",
      nombre_equipo: "",
      rubro: "",
      descripcion: "",
      activo: true,
    },
  })

  useEffect(() => {
    if (open) {
      setError(null)
      setLoading(false)
      setUploading(false)
      setImagenFile(null)
      setPdfFile(null)
      setImagenPreview(null)
      setCurrentImagenUrl(null)
      setCurrentPdfUrl(null)
      if (isEditing && productoId) {
        loadProductoData()
      } else {
        reset({
          marca: "",
          modelo: "",
          nombre_equipo: "",
          rubro: "",
          descripcion: "",
          activo: true,
        })
      }
    }
  }, [open, productoId, isEditing, reset])

  const loadProductoData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !productoId) return

      const { data: productoData, error: productoError } = await supabase
        .from("productos")
        .select("*")
        .eq("id", productoId)
        .single()

      if (productoError || !productoData) {
        setError("Error al cargar el producto")
        return
      }

      reset({
        marca: productoData.marca || "",
        modelo: productoData.modelo || "",
        nombre_equipo: productoData.nombre_equipo || "",
        rubro: productoData.rubro || "",
        descripcion: productoData.descripcion || "",
        activo: productoData.activo ?? true,
      })

      setCurrentImagenUrl(productoData.imagen_url)
      setCurrentPdfUrl(productoData.especificaciones_pdf_url)
    } catch (error) {
      console.error("Error:", error)
      setError("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }, [productoId, reset, supabase])

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("El archivo debe ser una imagen")
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("La imagen no puede exceder 5MB")
        return
      }
      setImagenFile(file)
      setError(null)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagenPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        setError("El archivo debe ser un PDF")
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("El PDF no puede exceder 10MB")
        return
      }
      setPdfFile(file)
      setError(null)
    }
  }

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("productos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (error) {
        console.error("Error uploading file:", error)
        if (error.message?.includes("Bucket not found") || error.message?.includes("not found")) {
          throw new Error("El bucket 'productos' no existe en Supabase Storage. Por favor, créalo en el Dashboard de Supabase.")
        }
        throw new Error(error.message || "Error al subir el archivo")
      }

      const { data: { publicUrl } } = supabase.storage
        .from("productos")
        .getPublicUrl(data.path)

      return publicUrl
    } catch (error: any) {
      console.error("Error:", error)
      throw error
    }
  }

  const deleteFile = async (url: string) => {
    try {
      // Extraer el path del archivo de la URL
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split("/")
      const path = pathParts.slice(pathParts.indexOf("productos") + 1).join("/")

      await supabase.storage
        .from("productos")
        .remove([path])
    } catch (error) {
      console.error("Error deleting file:", error)
    }
  }

  const onSubmit = async (data: ProductoFormValues) => {
    setError(null)
    setLoading(true)
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("No estás autenticado")
        return
      }

      let imagenUrl = currentImagenUrl
      let pdfUrl = currentPdfUrl

      // Subir imagen si hay una nueva
      if (imagenFile) {
        const timestamp = Date.now()
        const fileExt = imagenFile.name.split(".").pop()
        const fileName = `${user.id}/${timestamp}-imagen.${fileExt}`
        
        // Eliminar imagen anterior si existe
        if (currentImagenUrl) {
          await deleteFile(currentImagenUrl)
        }

        try {
          const uploadedUrl = await uploadFile(imagenFile, fileName)
          if (uploadedUrl) {
            imagenUrl = uploadedUrl
          } else {
            setError("Error al subir la imagen")
            return
          }
        } catch (uploadError: any) {
          setError(uploadError.message || "Error al subir la imagen")
          return
        }
      }

      // Subir PDF si hay uno nuevo
      if (pdfFile) {
        const timestamp = Date.now()
        const fileName = `${user.id}/${timestamp}-especificaciones.pdf`
        
        // Eliminar PDF anterior si existe
        if (currentPdfUrl) {
          await deleteFile(currentPdfUrl)
        }

        try {
          const uploadedUrl = await uploadFile(pdfFile, fileName)
          if (uploadedUrl) {
            pdfUrl = uploadedUrl
          } else {
            setError("Error al subir el PDF")
            return
          }
        } catch (uploadError: any) {
          setError(uploadError.message || "Error al subir el PDF")
          return
        }
      }

      const productoData: any = {
        marca: data.marca,
        modelo: data.modelo,
        nombre_equipo: data.nombre_equipo,
        rubro: data.rubro,
        descripcion: data.descripcion || null,
        imagen_url: imagenUrl,
        especificaciones_pdf_url: pdfUrl,
        activo: data.activo,
      }

      if (isEditing && productoId) {
        // Actualizar producto existente
        const { error: updateError } = await supabase
          .from("productos")
          .update(productoData)
          .eq("id", productoId)

        if (updateError) {
          setError(updateError.message)
          return
        }
      } else {
        // Crear nuevo producto
        productoData.created_by = user.id

        const { error: insertError } = await supabase
          .from("productos")
          .insert(productoData)

        if (insertError) {
          setError(insertError.message)
          return
        }
      }

      onSuccess?.()
      onOpenChange(false)
      reset()
      setImagenFile(null)
      setPdfFile(null)
      setImagenPreview(null)
      setCurrentImagenUrl(null)
      setCurrentPdfUrl(null)
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud")
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del producto"
              : "Agrega un nuevo producto o equipo al catálogo"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marca">
                Marca <span className="text-destructive">*</span>
              </Label>
              <Input
                id="marca"
                {...register("marca")}
                placeholder="Ej: Siemens"
                disabled={loading || uploading}
              />
              {errors.marca && (
                <p className="text-sm text-destructive">{errors.marca.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelo">
                Modelo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="modelo"
                {...register("modelo")}
                placeholder="Ej: ACUSON X300"
                disabled={loading || uploading}
              />
              {errors.modelo && (
                <p className="text-sm text-destructive">{errors.modelo.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre_equipo">
              Nombre del Equipo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombre_equipo"
              {...register("nombre_equipo")}
              placeholder="Ej: Ecógrafo Portátil"
              disabled={loading || uploading}
            />
            {errors.nombre_equipo && (
              <p className="text-sm text-destructive">{errors.nombre_equipo.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rubro">
              Rubro <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch("rubro")}
              onValueChange={(value) => setValue("rubro", value)}
              disabled={loading || uploading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rubro" />
              </SelectTrigger>
              <SelectContent>
                {RUBROS.map((rubro) => (
                  <SelectItem key={rubro} value={rubro}>
                    {rubro}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.rubro && (
              <p className="text-sm text-destructive">{errors.rubro.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              {...register("descripcion")}
              placeholder="Descripción detallada del producto..."
              disabled={loading || uploading}
              rows={3}
            />
            {errors.descripcion && (
              <p className="text-sm text-destructive">{errors.descripcion.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Imagen del Producto</Label>
            <div className="space-y-2">
              {imagenPreview && (
                <div className="relative w-full h-48 border rounded-md overflow-hidden">
                  <img
                    src={imagenPreview}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImagenFile(null)
                      setImagenPreview(null)
                      if (imagenInputRef.current) {
                        imagenInputRef.current.value = ""
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {!imagenPreview && currentImagenUrl && (
                <div className="relative w-full h-48 border rounded-md overflow-hidden">
                  <img
                    src={currentImagenUrl}
                    alt="Imagen actual"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    Imagen actual
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  ref={imagenInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImagenChange}
                  disabled={loading || uploading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imagenInputRef.current?.click()}
                  disabled={loading || uploading}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Seleccionar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Formatos: JPG, PNG, GIF. Tamaño máximo: 5MB
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Especificaciones Técnicas (PDF)</Label>
            <div className="space-y-2">
              {pdfFile && (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-sm">{pdfFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setPdfFile(null)
                      if (pdfInputRef.current) {
                        pdfInputRef.current.value = ""
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {!pdfFile && currentPdfUrl && (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-sm">Especificaciones actuales</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(currentPdfUrl, "_blank")}
                  >
                    Ver PDF
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfChange}
                  disabled={loading || uploading}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={loading || uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Seleccionar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Formato: PDF. Tamaño máximo: 10MB
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="activo"
                checked={watch("activo")}
                onChange={(e) => setValue("activo", e.target.checked)}
                disabled={loading || uploading}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="activo" className="cursor-pointer">
                Producto activo
              </Label>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || uploading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo archivos...
                </>
              ) : loading ? (
                "Guardando..."
              ) : isEditing ? (
                "Actualizar"
              ) : (
                "Crear"
              )}{" "}
              Producto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
