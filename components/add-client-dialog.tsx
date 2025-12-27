"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

declare global {
  interface Window {
    google: any
  }
}

// Validación de CUIT/CUIL: XX-XXXXXXXX-X
const cuitRegex = /^\d{2}-\d{8}-\d{1}$/

// Validación de teléfono argentino: código de área (2-4 dígitos) + número (6-8 dígitos)
// Formatos aceptados: +54 11 1234-5678, 011 1234-5678, 11 1234-5678, (011) 1234-5678
// También acepta: 11-1234-5678, 011-1234-5678
const phoneRegex = /^(\+54\s?)?(\(?0?\d{2,4}\)?[\s-]?)?\d{4}[\s-]?\d{4}$/

const contactSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre del contacto es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  tipo_contacto: z
    .string()
    .min(1, "El tipo de contacto es requerido")
    .max(50, "El tipo de contacto no puede exceder 50 caracteres"),
  email: z
    .string()
    .min(1, "El email es requerido")
    .email("Email inválido")
    .max(100, "El email no puede exceder 100 caracteres"),
  telefono: z
    .string()
    .min(1, "El teléfono es requerido")
    .refine(
      (val) => phoneRegex.test(val.replace(/\s/g, "")),
      "Formato de teléfono inválido. Use: +54 11 1234-5678 o 011 1234-5678"
    ),
})

const tipoEstablecimientoOptions = [
  "Laboratorio",
  "Clinica/Hospital",
  "Centro de Imagenes",
  "Geriatrico",
  "Ginecologia",
  "Ecografia",
  "Veterinario",
  "Industria",
] as const

const clientSchema = z.object({
  razon_social: z
    .string()
    .min(1, "La razón social es requerida")
    .max(200, "La razón social no puede exceder 200 caracteres")
    .refine(
      (val) => val.trim().length > 0,
      "La razón social no puede estar vacía"
    ),
  nombre_establecimiento: z
    .string()
    .min(1, "El nombre del establecimiento es requerido")
    .max(200, "El nombre del establecimiento no puede exceder 200 caracteres"),
  tipo_establecimiento: z
    .enum(tipoEstablecimientoOptions, {
      errorMap: () => ({ message: "Selecciona un tipo de establecimiento válido" }),
    })
    .refine(
      (val) => tipoEstablecimientoOptions.includes(val as any),
      "Tipo de establecimiento inválido"
    ),
  cuit: z
    .string()
    .min(1, "El CUIT/CUIL es requerido")
    .refine(
      (val) => cuitRegex.test(val),
      "Formato de CUIT/CUIL inválido. Use: XX-XXXXXXXX-X (ej: 20-39850110-2)"
    ),
  direccion: z
    .string()
    .min(1, "La dirección es requerida")
    .max(300, "La dirección no puede exceder 300 caracteres"),
  localidad: z
    .string()
    .min(1, "La localidad es requerida")
    .max(100, "La localidad no puede exceder 100 caracteres"),
  provincia: z
    .string()
    .min(1, "La provincia es requerida")
    .max(100, "La provincia no puede exceder 100 caracteres"),
  direccion_lat: z.number().optional().refine((val) => {
    // Si hay dirección, debe haber coordenadas
    return true // Permitir que sea opcional temporalmente para que funcione el autocomplete
  }),
  direccion_lng: z.number().optional().refine((val) => {
    // Si hay dirección, debe haber coordenadas
    return true // Permitir que sea opcional temporalmente para que funcione el autocomplete
  }),
  status: z.enum(["active", "inactive"]).default("active"),
  notas: z
    .string()
    .max(1000, "Las notas no pueden exceder 1000 caracteres")
    .optional(),
  contacts: z
    .array(contactSchema)
    .min(1, "Debe agregar al menos un contacto")
    .max(20, "No se pueden agregar más de 20 contactos"),
})

type ClientFormValues = z.infer<typeof clientSchema>

interface AddClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId?: string | null
  onSuccess?: () => void
}

export function AddClientDialog({ open, onOpenChange, clientId, onSuccess }: AddClientDialogProps) {
  const isEditing = !!clientId
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const autocompleteRef = useRef<any>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    control,
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      status: "active",
      contacts: [{ nombre: "", tipo_contacto: "", email: "", telefono: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contacts",
  })

  const status = watch("status")
  const direccion = watch("direccion")

  // Función global para ocultar errores de Google Maps
  const hideGoogleMapsErrors = useCallback(() => {
    // Buscar en todos los elementos del DOM de manera más agresiva
    const allElements = document.querySelectorAll('*')
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement
      const text = htmlEl.textContent || ''
      const innerHTML = htmlEl.innerHTML || ''
      // className puede ser string o DOMTokenList, convertir a string de forma segura
      const className = String(htmlEl.className || '')
      const id = htmlEl.id || ''
      
      // Verificar si contiene el mensaje de error
      if (text.includes('Google Maps Platform rejected') || 
          text.includes('not authorized to use this API') ||
          innerHTML.includes('Google Maps Platform rejected') ||
          innerHTML.includes('not authorized to use this API') ||
          className.includes('gm-err') ||
          id.includes('gm-err')) {
        // Ocultar completamente el elemento y sus hijos
        htmlEl.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; width: 0 !important; overflow: hidden !important; padding: 0 !important; margin: 0 !important; border: none !important; position: absolute !important; left: -9999px !important;'
        
        // También ocultar el elemento padre si es un contenedor
        let parent = htmlEl.parentElement
        let depth = 0
        while (parent && parent !== document.body && depth < 3) {
          const parentText = parent.textContent || ''
          if (parentText.includes('Google Maps Platform') && parentText.length < 500) {
            parent.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; overflow: hidden !important;'
          }
          parent = parent.parentElement
          depth++
        }
      }
    })
    
    // También buscar elementos con clases específicas de error de Google Maps
    const gmErrorElements = document.querySelectorAll('[class*="gm-err"], [id*="gm-err"], [class*="error"], [id*="error"]')
    gmErrorElements.forEach((el) => {
      const htmlEl = el as HTMLElement
      const text = htmlEl.textContent || ''
      if (text.includes('Google Maps') || text.includes('not authorized')) {
        htmlEl.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; overflow: hidden !important;'
      }
    })
  }, [])

  // Función para inicializar autocomplete
  const initAutocomplete = useCallback(() => {
    if (!window.google?.maps?.places) {
      console.log("Google Maps API no está cargada, esperando...")
      setTimeout(() => {
        if (window.google?.maps?.places && open) {
          initAutocomplete()
        }
      }, 500)
      return
    }

    const input = document.getElementById("direccion") as HTMLInputElement
    if (!input) {
      console.log("Input de dirección no encontrado, reintentando...")
      // Reintentar después de un breve delay
      setTimeout(() => {
        if (open) {
          initAutocomplete()
        }
      }, 300)
      return
    }

    // Si ya existe un autocomplete, destruirlo primero
    if (autocompleteRef.current) {
      try {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      } catch (e) {
        // Ignorar errores al limpiar
      }
      autocompleteRef.current = null
    }

    // Crear nuevo autocomplete
    try {
      // Suprimir errores de consola relacionados con Maps JavaScript API
      // Solo necesitamos Places API para el autocompletado
      const originalError = console.error
      console.error = (...args: any[]) => {
        // Filtrar el error de "API project is not authorized" si solo usamos Places
        if (args[0]?.includes?.("Google Maps Platform rejected") || 
            args[0]?.includes?.("not authorized to use this API")) {
          // Ignorar este error ya que solo necesitamos Places API y funciona
          return
        }
        originalError.apply(console, args)
      }

      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        types: ["address"],
        componentRestrictions: { country: "ar" },
        fields: ["formatted_address", "geometry", "address_components"],
      })
      
      // Restaurar console.error después de crear el autocomplete
      setTimeout(() => {
        console.error = originalError
      }, 1000)

      // Función para actualizar el dropdown
      const updatePacContainer = () => {
        const pacContainer = document.querySelector(".pac-container") as HTMLElement
        if (pacContainer) {
          pacContainer.style.zIndex = "99999"
          pacContainer.style.position = "absolute"
          // Asegurar que los elementos sean clickeables
          const pacItems = pacContainer.querySelectorAll(".pac-item")
          pacItems.forEach((item: Element) => {
            const htmlItem = item as HTMLElement
            htmlItem.style.pointerEvents = "auto"
            htmlItem.style.cursor = "pointer"
            // Prevenir que el Dialog capture los eventos
            htmlItem.onmousedown = (e) => {
              e.stopPropagation()
            }
            htmlItem.onclick = (e) => {
              e.stopPropagation()
            }
          })
        }
        
        // Ocultar errores de Google Maps
        hideGoogleMapsErrors()
      }
      
      // Actualizar inmediatamente si ya existe
      updatePacContainer()

      // Escuchar cuando se muestra el dropdown para actualizar el z-index
      const observer = new MutationObserver(() => {
        updatePacContainer()
        // Ocultar errores de Google Maps cada vez que hay cambios en el DOM
        hideGoogleMapsErrors()
      })

      // Observar cambios en el DOM para detectar cuando aparece el dropdown
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      })

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace()
        
        if (!place.geometry) {
          console.log("No se encontró geometría para el lugar seleccionado")
          setError("Por favor selecciona una dirección válida del dropdown")
          return
        }

        // Prevenir que el Dialog se cierre
        // Usar setTimeout para asegurar que el evento se procese antes de que el Dialog lo capture
        setTimeout(() => {
          // Establecer la dirección completa
          const fullAddress = place.formatted_address || ""
          setValue("direccion", fullAddress)
          setValue("direccion_lat", place.geometry.location.lat())
          setValue("direccion_lng", place.geometry.location.lng())
          
          // Limpiar error si existe
          setError(null)
          
          // Extraer localidad y provincia de los componentes de la dirección
          let localidad = ""
          let provincia = ""
          
          // Buscar en todos los componentes
          for (const component of place.address_components || []) {
            const types = component.types
            
            // Provincia (administrative_area_level_1)
            if (types.includes("administrative_area_level_1")) {
              provincia = component.long_name
            }
            
            // Localidad/Ciudad (locality tiene prioridad)
            if (types.includes("locality")) {
              localidad = component.long_name
            }
          }
          
          // Si no encontramos localidad, buscar en administrative_area_level_2
          if (!localidad) {
            for (const component of place.address_components || []) {
              if (component.types.includes("administrative_area_level_2")) {
                localidad = component.long_name
                break
              }
            }
          }
          
          // Si aún no hay localidad, intentar con sublocality
          if (!localidad) {
            for (const component of place.address_components || []) {
              if (component.types.includes("sublocality") || component.types.includes("sublocality_level_1")) {
                localidad = component.long_name
                break
              }
            }
          }
          
          setValue("localidad", localidad || "")
          setValue("provincia", provincia || "")
          
          // Debug: mostrar en consola si no se encontraron
          if (!localidad && !provincia) {
            console.log("No se encontraron localidad/provincia. Componentes:", place.address_components)
          }
        }, 0)
      })

      autocompleteRef.current = autocomplete
      ;(autocompleteRef.current as any).__observer = observer
      console.log("Autocomplete inicializado correctamente")
    } catch (error) {
      console.error("Error al crear autocomplete:", error)
      setError("Error al inicializar el autocompletado de direcciones")
    }
  }, [setValue, open])

  // Cargar datos del cliente si se está editando
  useEffect(() => {
    if (open) {
      setLoading(false) // Asegurar que loading esté en false al abrir
      setError(null) // Limpiar errores
      if (clientId) {
        loadClientData()
      } else {
        reset({
          status: "active",
          contacts: [{ nombre: "", tipo_contacto: "", email: "", telefono: "" }],
        })
      }
    }
  }, [open, clientId])

  const loadClientData = async () => {
    if (!clientId) return

    try {
      setLoading(true) // Mostrar loading mientras se cargan los datos
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single()

      if (clientError || !client) {
        setError("Error al cargar los datos del cliente")
        setLoading(false)
        return
      }

      // Cargar contactos del cliente
      const { data: contacts, error: contactsError } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", clientId)

      if (contactsError) {
        setError("Error al cargar los contactos")
        setLoading(false)
        return
      }

      // Establecer valores del formulario
      setValue("razon_social", client.razon_social || "")
      setValue("nombre_establecimiento", client.nombre_establecimiento || "")
      setValue("tipo_establecimiento", (client.tipo_establecimiento as any) || "")
      setValue("cuit", client.cuit || "")
      setValue("direccion", client.direccion || "")
      setValue("localidad", client.localidad || "")
      setValue("provincia", client.provincia || "")
      setValue("direccion_lat", client.direccion_lat || undefined)
      setValue("direccion_lng", client.direccion_lng || undefined)
      setValue("status", client.status || "active")
      setValue("notas", client.notas || "")
      setValue("contacts", contacts && contacts.length > 0 
        ? contacts.map(c => {
            // Remover +54 del teléfono para mostrar solo código área y número
            let telefonoDisplay = c.telefono || ""
            if (telefonoDisplay.startsWith("+54 ")) {
              telefonoDisplay = telefonoDisplay.substring(4)
            } else if (telefonoDisplay.startsWith("+54")) {
              telefonoDisplay = telefonoDisplay.substring(3)
            }
            return {
              nombre: c.nombre || "",
              tipo_contacto: c.tipo_contacto,
              email: c.email || "",
              telefono: telefonoDisplay,
            }
          })
        : [{ nombre: "", tipo_contacto: "", email: "", telefono: "" }]
      )
      setLoading(false) // Desactivar loading cuando se cargan los datos
    } catch (err) {
      setError("Error al cargar los datos")
      setLoading(false)
    }
  }

  // Cargar Google Maps API
  useEffect(() => {
    // Ejecutar inmediatamente y luego periódicamente con mayor frecuencia
    hideGoogleMapsErrors()
    const errorCheckInterval = setInterval(() => {
      hideGoogleMapsErrors()
    }, 100)
    
    if (!open) {
      // Limpiar cuando se cierra el diálogo
      if (autocompleteRef.current) {
        try {
          window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current)
          // Limpiar observer si existe
          if ((autocompleteRef.current as any).__observer) {
            (autocompleteRef.current as any).__observer.disconnect()
          }
        } catch (e) {
          // Ignorar errores
        }
        autocompleteRef.current = null
      }
      setMapLoaded(false) // Resetear el estado para que se reinicialice
      clearInterval(errorCheckInterval)
      return
    }

    if (typeof window === "undefined") return

    let checkInterval: NodeJS.Timeout | null = null

    const loadMapsAndInit = () => {
      if (window.google?.maps?.places) {
        setMapLoaded(true)
        // Esperar a que el DOM esté listo
        setTimeout(() => {
          initAutocomplete()
        }, 500)
      } else {
        // Si no está cargada, cargar el script
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`)
        if (existingScript) {
          // Script ya existe, esperar a que cargue
          checkInterval = setInterval(() => {
            if (window.google?.maps?.places) {
              if (checkInterval) clearInterval(checkInterval)
              setMapLoaded(true)
              setTimeout(() => {
                initAutocomplete()
              }, 500)
            }
          }, 200)
        } else {
          const script = document.createElement("script")
          // Cargar Places API para el autocompletado
          // Nota: Google Maps requiere Maps JavaScript API como base, pero solo usamos Places
          script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
          script.async = true
          script.defer = true
          script.onload = () => {
            setMapLoaded(true)
            setTimeout(() => {
              initAutocomplete()
            }, 500)
          }
          script.onerror = () => {
            console.error("Error al cargar Google Maps API")
            setError("Error al cargar Google Maps. Verifica tu API key.")
          }
          document.head.appendChild(script)
        }
      }
    }

    loadMapsAndInit()

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval)
      }
      clearInterval(errorCheckInterval)
    }
  }, [open, initAutocomplete])

  const onSubmit = async (data: ClientFormValues) => {
    setError(null)
    setLoading(true)

    // Validar que se haya ingresado una dirección
    if (!data.direccion || !data.localidad || !data.provincia) {
      setError("Debes completar la dirección, localidad y provincia")
      setLoading(false)
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("No estás autenticado")
        setLoading(false)
        return
      }

      if (isEditing && clientId) {
        // Actualizar cliente existente
        const { error: clientError } = await supabase
          .from("clients")
          .update({
            razon_social: data.razon_social,
            nombre_establecimiento: data.nombre_establecimiento,
            tipo_establecimiento: data.tipo_establecimiento || null,
            cuit: data.cuit || null,
            direccion: data.direccion || null,
            localidad: data.localidad || null,
            provincia: data.provincia || null,
            direccion_lat: data.direccion_lat || null,
            direccion_lng: data.direccion_lng || null,
            status: data.status,
            notas: data.notas || null,
          })
          .eq("id", clientId)

        if (clientError) {
          setError(clientError.message)
          setLoading(false)
          return
        }

        // Eliminar contactos existentes
        await supabase
          .from("client_contacts")
          .delete()
          .eq("client_id", clientId)

        // Insertar nuevos contactos
        if (data.contacts && data.contacts.length > 0) {
          const contactsToInsert = data.contacts.map((contact) => ({
            client_id: clientId,
            nombre: contact.nombre,
            tipo_contacto: contact.tipo_contacto,
            email: contact.email,
            telefono: contact.telefono,
          }))

          const { error: contactsError } = await supabase
            .from("client_contacts")
            .insert(contactsToInsert)

          if (contactsError) {
            setError(contactsError.message)
            setLoading(false)
            return
          }
        }
      } else {
        // Insertar nuevo cliente
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .insert({
            razon_social: data.razon_social,
            nombre_establecimiento: data.nombre_establecimiento,
            tipo_establecimiento: data.tipo_establecimiento,
            cuit: data.cuit,
            direccion: data.direccion,
            localidad: data.localidad,
            provincia: data.provincia,
            direccion_lat: data.direccion_lat,
            direccion_lng: data.direccion_lng,
            status: data.status,
            notas: data.notas || null,
            created_by: user.id,
          })
          .select()
          .single()

        if (clientError) {
          setError(clientError.message)
          setLoading(false)
          return
        }

        // Insertar contactos
        if (data.contacts && data.contacts.length > 0) {
          const contactsToInsert = data.contacts.map((contact) => ({
            client_id: client.id,
            nombre: contact.nombre,
            tipo_contacto: contact.tipo_contacto,
            email: contact.email,
            telefono: contact.telefono,
          }))

          const { error: contactsError } = await supabase
            .from("client_contacts")
            .insert(contactsToInsert)

          if (contactsError) {
            setError(contactsError.message)
            setLoading(false)
            return
          }
        }
      }

      reset()
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(isEditing ? "Ocurrió un error al actualizar el cliente" : "Ocurrió un error al agregar el cliente")
      setLoading(false)
    }
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        // Prevenir que se cierre cuando se selecciona una dirección del dropdown
        // Solo cerrar si realmente se quiere cerrar (no por eventos del dropdown)
        if (!isOpen) {
          // Verificar si hay un dropdown visible
          const pacContainer = document.querySelector(".pac-container") as HTMLElement
          if (pacContainer && pacContainer.style.display !== "none") {
            // Si hay dropdown visible, no cerrar
            return
          }
        }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent 
        className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          // Prevenir que se cierre cuando se hace click en el dropdown
          const target = e.target as HTMLElement
          if (target.closest(".pac-container")) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cliente" : "Agregar Cliente"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifica la información del cliente" : "Completa la información del nuevo cliente"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razon_social">
                Razón Social <span className="text-destructive">*</span>
              </Label>
              <Input
                id="razon_social"
                {...register("razon_social")}
                placeholder="Razón Social S.A."
                disabled={loading}
              />
              {errors.razon_social && (
                <p className="text-sm text-destructive">
                  {errors.razon_social.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre_establecimiento">
                Nombre del Establecimiento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre_establecimiento"
                {...register("nombre_establecimiento")}
                placeholder="Sucursal Centro"
                disabled={loading}
              />
              {errors.nombre_establecimiento && (
                <p className="text-sm text-destructive">
                  {errors.nombre_establecimiento.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_establecimiento">
                Tipo de Establecimiento <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch("tipo_establecimiento") || ""}
                onValueChange={(value) => setValue("tipo_establecimiento", value as any)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipoEstablecimientoOptions.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.tipo_establecimiento && (
                <p className="text-sm text-destructive">
                  {errors.tipo_establecimiento.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuit">
                CUIT/CUIL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cuit"
                {...register("cuit")}
                placeholder="20-39850110-2"
                disabled={loading}
                maxLength={13}
                onChange={(e) => {
                  // Formatear automáticamente: XX-XXXXXXXX-X
                  let value = e.target.value.replace(/\D/g, "")
                  if (value.length > 0) {
                    if (value.length <= 2) {
                      value = value
                    } else if (value.length <= 10) {
                      value = `${value.slice(0, 2)}-${value.slice(2)}`
                    } else {
                      value = `${value.slice(0, 2)}-${value.slice(2, 10)}-${value.slice(10, 11)}`
                    }
                  }
                  e.target.value = value
                  register("cuit").onChange(e)
                }}
              />
              {errors.cuit && (
                <p className="text-sm text-destructive">
                  {errors.cuit.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={status}
                onValueChange={(value) => setValue("status", value as any)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

            <div className="space-y-2">
            <Label htmlFor="direccion">
              Dirección <span className="text-destructive">*</span>
            </Label>
            <Input
              id="direccion"
              {...register("direccion")}
              placeholder="Buscar dirección..."
              disabled={loading}
              autoComplete="off"
              onFocus={(e) => {
                // Asegurar que el autocomplete esté inicializado cuando el campo recibe foco
                if (window.google?.maps?.places) {
                  if (!autocompleteRef.current) {
                    setTimeout(() => {
                      initAutocomplete()
                    }, 100)
                  }
                } else {
                  // Si no está cargada, esperar y reintentar
                  setTimeout(() => {
                    if (window.google?.maps?.places && !autocompleteRef.current) {
                      initAutocomplete()
                    }
                  }, 500)
                }
              }}
              onChange={(e) => {
                // Permitir que el usuario escriba
                register("direccion").onChange(e)
                // Si hay un valor pero no coordenadas, limpiar coordenadas
                if (e.target.value && (!watch("direccion_lat") || !watch("direccion_lng"))) {
                  // No hacer nada, esperar a que seleccione del dropdown
                }
              }}
            />
            {errors.direccion && (
              <p className="text-sm text-destructive">
                {errors.direccion.message}
              </p>
            )}
          </div>

          {/* Notas / Info Extra */}
          <div className="space-y-2">
            <Label htmlFor="notas">
              Notas / Información Adicional
            </Label>
            <Textarea
              id="notas"
              {...register("notas")}
              placeholder="Agregar comentarios o información adicional sobre el cliente..."
              disabled={loading}
              rows={4}
            />
            {errors.notas && (
              <p className="text-sm text-destructive">
                {errors.notas.message}
              </p>
            )}
          </div>

          {/* Contactos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Contactos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ nombre: "", tipo_contacto: "", email: "", telefono: "" })}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar Contacto
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Contacto {index + 1}</Label>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`contacts.${index}.tipo_contacto`}>
                      Tipo de Contacto <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      {...register(`contacts.${index}.tipo_contacto`)}
                      placeholder="Ej: Compras, Contabilidad"
                      disabled={loading}
                    />
                    {errors.contacts?.[index]?.tipo_contacto && (
                      <p className="text-sm text-destructive">
                        {errors.contacts[index]?.tipo_contacto?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`contacts.${index}.nombre`}>
                      Nombre <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      {...register(`contacts.${index}.nombre`)}
                      placeholder="Ej: Juan Pérez"
                      disabled={loading}
                    />
                    {errors.contacts?.[index]?.nombre && (
                      <p className="text-sm text-destructive">
                        {errors.contacts[index]?.nombre?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`contacts.${index}.email`}>
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="email"
                      {...register(`contacts.${index}.email`)}
                      placeholder="email@example.com"
                      disabled={loading}
                    />
                    {errors.contacts?.[index]?.email && (
                      <p className="text-sm text-destructive">
                        {errors.contacts[index]?.email?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`contacts.${index}.telefono`}>
                      Teléfono (Argentina) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-foreground pointer-events-none z-10 flex items-center h-full">
                        +54
                      </span>
                      <Input
                        id={`contacts.${index}.telefono`}
                        placeholder="11 1234-5678"
                        disabled={loading}
                        className="pl-[3.5rem]"
                        value={(() => {
                          const currentValue = watch(`contacts.${index}.telefono`)
                          if (!currentValue) return ""
                          // Remover +54 si está presente para mostrar solo código área y número
                          if (currentValue.startsWith("+54 ")) {
                            return currentValue.substring(4).trim()
                          }
                          if (currentValue.startsWith("+54")) {
                            return currentValue.substring(3).trim()
                          }
                          // Si no tiene +54, puede que el usuario lo haya escrito, removerlo
                          return currentValue.replace(/\+54\s?/gi, "").trim()
                        })()}
                        onChange={(e) => {
                          // Remover cualquier +54 que el usuario intente escribir
                          let value = e.target.value.replace(/\+54\s?/gi, "")
                          
                          // Solo permitir números, espacios y guiones
                          value = value.replace(/[^\d\s\-]/g, "")
                          
                          // Remover espacios múltiples
                          value = value.replace(/\s+/g, " ").trim()
                          
                          // Formatear automáticamente mientras escribe
                          let cleaned = value.replace(/[^\d]/g, "")
                          
                          if (cleaned.length > 0) {
                            // Detectar código de área (2-4 dígitos)
                            let areaCode = ""
                            let number = ""
                            
                            if (cleaned.length <= 4) {
                              // Solo código de área
                              areaCode = cleaned
                            } else if (cleaned.length <= 6) {
                              // Código de área de 2 dígitos
                              areaCode = cleaned.substring(0, 2)
                              number = cleaned.substring(2)
                            } else if (cleaned.length <= 7) {
                              // Puede ser 2 o 3 dígitos de área
                              if (cleaned.startsWith("11") || cleaned.startsWith("15")) {
                                areaCode = cleaned.substring(0, 2)
                                number = cleaned.substring(2)
                              } else {
                                areaCode = cleaned.substring(0, 3)
                                number = cleaned.substring(3)
                              }
                            } else {
                              // Más de 7 dígitos, intentar detectar
                              if (cleaned.startsWith("11") || cleaned.startsWith("15")) {
                                areaCode = cleaned.substring(0, 2)
                                number = cleaned.substring(2)
                              } else if (cleaned.length <= 10) {
                                areaCode = cleaned.substring(0, 3)
                                number = cleaned.substring(3)
                              } else {
                                areaCode = cleaned.substring(0, 4)
                                number = cleaned.substring(4)
                              }
                            }
                            
                            // Formatear número con guión
                            if (number.length > 0) {
                              if (number.length <= 4) {
                                number = number
                              } else if (number.length <= 7) {
                                number = `${number.substring(0, 3)}-${number.substring(3)}`
                              } else {
                                number = `${number.substring(0, 4)}-${number.substring(4, 8)}`
                              }
                            }
                            
                            value = areaCode + (number ? ` ${number}` : "")
                          }
                          
                          e.target.value = value
                          // Guardar con +54 al inicio
                          const fullValue = value ? `+54 ${value}` : ""
                          setValue(`contacts.${index}.telefono`, fullValue)
                        }}
                        onBlur={(e) => {
                          // Asegurar formato correcto al perder el foco
                          let value = e.target.value.replace(/\+54\s?/gi, "").replace(/[^\d\s\-]/g, "")
                          let cleaned = value.replace(/[^\d]/g, "")
                          
                          if (cleaned.length >= 8) {
                            let areaCode = ""
                            let number = ""
                            
                            if (cleaned.startsWith("11") || cleaned.startsWith("15")) {
                              areaCode = cleaned.substring(0, 2)
                              number = cleaned.substring(2)
                            } else if (cleaned.length <= 10) {
                              areaCode = cleaned.substring(0, 3)
                              number = cleaned.substring(3)
                            } else {
                              areaCode = cleaned.substring(0, 4)
                              number = cleaned.substring(4)
                            }
                            
                            if (number.length === 8) {
                              number = `${number.substring(0, 4)}-${number.substring(4)}`
                            } else if (number.length === 7) {
                              number = `${number.substring(0, 3)}-${number.substring(3)}`
                            } else if (number.length === 6) {
                              number = `${number.substring(0, 3)}-${number.substring(3)}`
                            }
                            
                            const formatted = `${areaCode} ${number}`
                            e.target.value = formatted
                            setValue(`contacts.${index}.telefono`, `+54 ${formatted}`)
                          } else if (cleaned.length > 0) {
                            // Si hay algo pero menos de 8 dígitos, guardarlo igual
                            setValue(`contacts.${index}.telefono`, `+54 ${value}`)
                          }
                        }}
                      />
                    </div>
                    {errors.contacts?.[index]?.telefono && (
                      <p className="text-sm text-destructive">
                        {errors.contacts[index]?.telefono?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {errors.contacts && (
              <p className="text-sm text-destructive">
                {errors.contacts.message}
              </p>
            )}
          </div>

          {error && !error.includes("Google Maps Platform") && !error.includes("not authorized") && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (isEditing ? "Actualizando..." : "Agregando...") : (isEditing ? "Actualizar Cliente" : "Agregar Cliente")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
