"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { 
  FileText, 
  Download, 
  Loader2, 
  BarChart3, 
  MapPin, 
  DollarSign, 
  Users, 
  TrendingUp,
  Calendar
} from "lucide-react"
import { formatDate, parseDateInput } from "@/lib/utils"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

interface VistaRapida {
  clientes: number
  rutas: number
  oportunidades: number
  ganadas: number
}

interface ReporteReciente {
  id: string
  nombre: string
  tipo: string
  fecha: string
  tamaño: string
  blob?: Blob
}

export default function ReportesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fechaDesde, setFechaDesde] = useState<string>("")
  const [fechaHasta, setFechaHasta] = useState<string>("")
  const [fechaDesdeDisplay, setFechaDesdeDisplay] = useState<string>("")
  const [fechaHastaDisplay, setFechaHastaDisplay] = useState<string>("")
  const [vistaRapida, setVistaRapida] = useState<VistaRapida>({
    clientes: 0,
    rutas: 0,
    oportunidades: 0,
    ganadas: 0,
  })
  const [reportesRecientes, setReportesRecientes] = useState<ReporteReciente[]>([])

  // Cargar reportes recientes desde localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("reportes-recientes")
      if (saved) {
        try {
          const reportes = JSON.parse(saved)
          setReportesRecientes(reportes)
        } catch (error) {
          console.error("Error loading recent reports:", error)
        }
      }
    }
  }, [])

  // Guardar reporte en el historial
  const guardarReporteEnHistorial = (nombre: string, tipo: string, blob: Blob) => {
    const tamañoMB = (blob.size / (1024 * 1024)).toFixed(1)
    const nuevoReporte: ReporteReciente = {
      id: Date.now().toString(),
      nombre,
      tipo,
      fecha: new Date().toISOString(),
      tamaño: `${tamañoMB} MB`,
      blob,
    }

    const nuevosReportes = [nuevoReporte, ...reportesRecientes].slice(0, 10) // Mantener solo los últimos 10
    setReportesRecientes(nuevosReportes)
    
    if (typeof window !== "undefined") {
      // Guardar solo la metadata, no el blob completo
      const reportesParaGuardar = nuevosReportes.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        tipo: r.tipo,
        fecha: r.fecha,
        tamaño: r.tamaño,
      }))
      localStorage.setItem("reportes-recientes", JSON.stringify(reportesParaGuardar))
    }
  }

  // Generar nombre descriptivo del reporte
  const generarNombreReporte = (tipo: string): string => {
    const nombres: Record<string, string> = {
      "resumen-ejecutivo": "Resumen Ejecutivo",
      "visitas": "Reporte de Visitas",
      "pipeline": "Pipeline de Oportunidades",
      "clientes": "Reporte de Clientes",
      "rendimiento": "Análisis de Rendimiento",
    }

    const nombreBase = nombres[tipo] || "Reporte"
    const fecha = new Date()
    const mes = fecha.toLocaleString("es-ES", { month: "long" })
    const año = fecha.getFullYear()
    
    return `${nombreBase} - ${mes.charAt(0).toUpperCase() + mes.slice(1)} ${año}`
  }

  // Función para formatear fecha de YYYY-MM-DD a DD/MM/YYYY
  const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString + "T00:00:00Z")
      if (isNaN(date.getTime())) return ""
      const day = String(date.getUTCDate()).padStart(2, "0")
      const month = String(date.getUTCMonth() + 1).padStart(2, "0")
      const year = date.getUTCFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return ""
    }
  }

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
        await cargarVistaRapida()
      } catch (error) {
        console.error("Error:", error)
        router.push("/dashboard")
      } finally {
        setLoading(false)
      }
    }

    checkAdminRole()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase])

  useEffect(() => {
    if (isAdmin) {
      cargarVistaRapida()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaDesde, fechaHasta, isAdmin])

  const cargarVistaRapida = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Contar clientes
      let queryClientes = supabase
        .from("clients")
        .select("id", { count: "exact", head: true })

      if (fechaDesde) {
        queryClientes = queryClientes.gte("created_at", fechaDesde)
      }
      if (fechaHasta) {
        queryClientes = queryClientes.lte("created_at", fechaHasta + "T23:59:59")
      }

      const { count: countClientes } = await queryClientes

      // Contar rutas
      let queryRutas = supabase
        .from("rutas")
        .select("id", { count: "exact", head: true })

      if (fechaDesde) {
        queryRutas = queryRutas.gte("fecha_inicio", fechaDesde)
      }
      if (fechaHasta) {
        queryRutas = queryRutas.lte("fecha_inicio", fechaHasta)
      }

      const { count: countRutas } = await queryRutas

      // Contar oportunidades
      let queryOportunidades = supabase
        .from("oportunidades")
        .select("id", { count: "exact", head: true })

      if (fechaDesde) {
        queryOportunidades = queryOportunidades.gte("created_at", fechaDesde)
      }
      if (fechaHasta) {
        queryOportunidades = queryOportunidades.lte("created_at", fechaHasta + "T23:59:59")
      }

      const { count: countOportunidades } = await queryOportunidades

      // Contar oportunidades ganadas
      let queryGanadas = supabase
        .from("oportunidades")
        .select("id", { count: "exact", head: true })
        .eq("estado", "ganada")

      if (fechaDesde) {
        queryGanadas = queryGanadas.gte("created_at", fechaDesde)
      }
      if (fechaHasta) {
        queryGanadas = queryGanadas.lte("created_at", fechaHasta + "T23:59:59")
      }

      const { count: countGanadas } = await queryGanadas

      setVistaRapida({
        clientes: countClientes || 0,
        rutas: countRutas || 0,
        oportunidades: countOportunidades || 0,
        ganadas: countGanadas || 0,
      })
    } catch (error) {
      console.error("Error loading vista rápida:", error)
    }
  }

  const generarPDF = async (tipo: string) => {
    try {
      setGenerating(tipo)
      setError(null)
      setSuccess(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("No estás autenticado")
        return
      }

      switch (tipo) {
        case "resumen-ejecutivo":
          await generarResumenEjecutivo()
          break
        case "visitas":
          await generarPDFVisitas()
          break
        case "pipeline":
          await generarPDFPipeline()
          break
        case "clientes":
          await generarPDFClientes()
          break
        case "rendimiento":
          await generarPDFRendimiento()
          break
        default:
          setError("Tipo de reporte no válido")
      }
    } catch (error: any) {
      console.error("Error generating PDF:", error)
      setError(`Error al generar el PDF: ${error?.message || "Error desconocido"}`)
    } finally {
      setGenerating(null)
    }
  }

  const generarResumenEjecutivo = async () => {
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text("Resumen Ejecutivo", 14, 20)

    if (fechaDesde || fechaHasta) {
      doc.setFontSize(10)
      let fechaTexto = "Período: "
      if (fechaDesde && fechaHasta) {
        fechaTexto += `${formatDate(fechaDesde)} - ${formatDate(fechaHasta)}`
      } else if (fechaDesde) {
        fechaTexto += `Desde ${formatDate(fechaDesde)}`
      } else if (fechaHasta) {
        fechaTexto += `Hasta ${formatDate(fechaHasta)}`
      }
      doc.text(fechaTexto, 14, 30)
    }

    let yPos = fechaDesde || fechaHasta ? 40 : 30

    // KPIs
    doc.setFontSize(14)
    doc.text("Indicadores Clave", 14, yPos)
    yPos += 10

    doc.setFontSize(10)
    doc.text(`Total Clientes: ${vistaRapida.clientes}`, 14, yPos)
    yPos += 7
    doc.text(`Total Rutas: ${vistaRapida.rutas}`, 14, yPos)
    yPos += 7
    doc.text(`Total Oportunidades: ${vistaRapida.oportunidades}`, 14, yPos)
    yPos += 7
    doc.text(`Oportunidades Ganadas: ${vistaRapida.ganadas}`, 14, yPos)
    yPos += 10

    // Tasa de conversión
    const tasaConversion = vistaRapida.oportunidades > 0 
      ? ((vistaRapida.ganadas / vistaRapida.oportunidades) * 100).toFixed(1)
      : "0"
    doc.text(`Tasa de Conversión: ${tasaConversion}%`, 14, yPos)

    doc.save(`resumen-ejecutivo-${new Date().toISOString().split("T")[0]}.pdf`)
    setSuccess("Resumen ejecutivo generado exitosamente")
  }

  const generarPDFVisitas = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from("rutas")
      .select("*")
      .order("fecha_inicio", { ascending: false })

    if (fechaDesde) {
      query = query.gte("fecha_inicio", fechaDesde)
    }
    if (fechaHasta) {
      query = query.lte("fecha_inicio", fechaHasta)
    }

    const { data: rutas, error: queryError } = await query

    if (queryError) {
      setError(`Error al obtener los datos: ${queryError.message}`)
      return
    }

    if (!rutas || rutas.length === 0) {
      setError("No hay rutas para generar el reporte")
      return
    }

    const rutaIds = rutas.map((r: any) => r.id)
    const { data: rutaClientes } = await supabase
      .from("ruta_clientes")
      .select("ruta_id, visitado")
      .in("ruta_id", rutaIds)

    const visitadosPorRuta: Record<string, number> = {}
    const totalPorRuta: Record<string, number> = {}

    rutaClientes?.forEach((rc) => {
      totalPorRuta[rc.ruta_id] = (totalPorRuta[rc.ruta_id] || 0) + 1
      if (rc.visitado) {
        visitadosPorRuta[rc.ruta_id] = (visitadosPorRuta[rc.ruta_id] || 0) + 1
      }
    })

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text("Reporte de Visitas", 14, 20)

    if (fechaDesde || fechaHasta) {
      doc.setFontSize(10)
      let fechaTexto = "Período: "
      if (fechaDesde && fechaHasta) {
        fechaTexto += `${formatDate(fechaDesde)} - ${formatDate(fechaHasta)}`
      } else if (fechaDesde) {
        fechaTexto += `Desde ${formatDate(fechaDesde)}`
      } else if (fechaHasta) {
        fechaTexto += `Hasta ${formatDate(fechaHasta)}`
      }
      doc.text(fechaTexto, 14, 30)
    }

    const tableData = rutas.map((ruta: any) => [
      ruta.nombre || "-",
      formatDate(ruta.fecha_inicio || ruta.fecha),
      ruta.fecha_finalizacion ? formatDate(ruta.fecha_finalizacion) : "-",
      ruta.estado === "finalizada" ? "Finalizada" : "Planificada",
      `${visitadosPorRuta[ruta.id] || 0}/${totalPorRuta[ruta.id] || 0}`,
    ])

    autoTable(doc, {
      head: [["Nombre", "Fecha Inicio", "Fecha Fin", "Estado", "Visitas"]],
      body: tableData,
      startY: fechaDesde || fechaHasta ? 35 : 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 54, 85] },
    })

    const blob = doc.output("blob")
    const nombreArchivo = `reporte-visitas-${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(nombreArchivo)
    guardarReporteEnHistorial(generarNombreReporte("visitas"), "visitas", blob)
    setSuccess("Reporte de visitas generado exitosamente")
  }

  const generarPDFPipeline = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from("oportunidades")
      .select(`
        *,
        cliente:clients(razon_social, nombre_establecimiento)
      `)
      .order("created_at", { ascending: false })

    if (fechaDesde) {
      query = query.gte("created_at", fechaDesde)
    }
    if (fechaHasta) {
      query = query.lte("created_at", fechaHasta + "T23:59:59")
    }

    const { data: oportunidades, error: queryError } = await query

    if (queryError) {
      setError(`Error al obtener los datos: ${queryError.message}`)
      return
    }

    if (!oportunidades || oportunidades.length === 0) {
      setError("No hay oportunidades para generar el reporte")
      return
    }

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text("Pipeline de Oportunidades", 14, 20)

    if (fechaDesde || fechaHasta) {
      doc.setFontSize(10)
      let fechaTexto = "Período: "
      if (fechaDesde && fechaHasta) {
        fechaTexto += `${formatDate(fechaDesde)} - ${formatDate(fechaHasta)}`
      } else if (fechaDesde) {
        fechaTexto += `Desde ${formatDate(fechaDesde)}`
      } else if (fechaHasta) {
        fechaTexto += `Hasta ${formatDate(fechaHasta)}`
      }
      doc.text(fechaTexto, 14, 30)
    }

    const tableData = oportunidades.map((op: any) => [
      op.titulo || "-",
      op.cliente?.razon_social || op.cliente?.nombre_establecimiento || "-",
      op.valor_estimado ? `$${op.valor_estimado.toLocaleString("es-AR")}` : "-",
      `${op.probabilidad}%`,
      op.estado === "nueva" ? "Nueva" :
      op.estado === "en_seguimiento" ? "En Seguimiento" :
      op.estado === "ganada" ? "Ganada" :
      op.estado === "perdida" ? "Perdida" : "Cerrada",
      op.fecha_cierre_estimada ? formatDate(op.fecha_cierre_estimada) : "-",
    ])

    autoTable(doc, {
      head: [["Título", "Cliente", "Valor Estimado", "Probabilidad", "Estado", "Fecha Cierre"]],
      body: tableData,
      startY: fechaDesde || fechaHasta ? 35 : 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 54, 85] },
    })

    const blob = doc.output("blob")
    const nombreArchivo = `pipeline-oportunidades-${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(nombreArchivo)
    guardarReporteEnHistorial(generarNombreReporte("pipeline"), "pipeline", blob)
    setSuccess("Pipeline de oportunidades generado exitosamente")
  }

  const generarPDFClientes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })

    if (fechaDesde) {
      query = query.gte("created_at", fechaDesde)
    }
    if (fechaHasta) {
      query = query.lte("created_at", fechaHasta + "T23:59:59")
    }

    const { data: clientes, error: queryError } = await query

    if (queryError) {
      setError(`Error al obtener los datos: ${queryError.message}`)
      return
    }

    if (!clientes || clientes.length === 0) {
      setError("No hay clientes para generar el reporte")
      return
    }

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text("Reporte de Clientes", 14, 20)

    if (fechaDesde || fechaHasta) {
      doc.setFontSize(10)
      let fechaTexto = "Período: "
      if (fechaDesde && fechaHasta) {
        fechaTexto += `${formatDate(fechaDesde)} - ${formatDate(fechaHasta)}`
      } else if (fechaDesde) {
        fechaTexto += `Desde ${formatDate(fechaDesde)}`
      } else if (fechaHasta) {
        fechaTexto += `Hasta ${formatDate(fechaHasta)}`
      }
      doc.text(fechaTexto, 14, 30)
    }

    const tableData = clientes.map((cliente: any) => [
      cliente.razon_social || "-",
      cliente.nombre_establecimiento || "-",
      cliente.cuit || "-",
      cliente.provincia || "-",
      cliente.localidad || "-",
      cliente.tipo_establecimiento || "-",
      cliente.status === "active" ? "Activo" : cliente.status === "inactive" ? "Inactivo" : "Lead",
    ])

    autoTable(doc, {
      head: [["Razón Social", "Establecimiento", "CUIT", "Provincia", "Ciudad", "Tipo", "Estado"]],
      body: tableData,
      startY: fechaDesde || fechaHasta ? 35 : 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 54, 85] },
    })

    const blob = doc.output("blob")
    const nombreArchivo = `reporte-clientes-${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(nombreArchivo)
    guardarReporteEnHistorial(generarNombreReporte("clientes"), "clientes", blob)
    setSuccess("Reporte de clientes generado exitosamente")
  }

  const generarPDFRendimiento = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Obtener todas las oportunidades para calcular métricas
    const { data: oportunidades } = await supabase
      .from("oportunidades")
      .select("*")

    // Obtener todas las rutas
    const { data: rutas } = await supabase
      .from("rutas")
      .select("*")

    // Obtener ruta_clientes para calcular tasa de visitas
    const { data: rutaClientes } = await supabase
      .from("ruta_clientes")
      .select("visitado")

    const totalOportunidades = oportunidades?.length || 0
    const ganadas = oportunidades?.filter((o: any) => o.estado === "ganada").length || 0
    const totalVisitas = rutaClientes?.length || 0
    const visitasRealizadas = rutaClientes?.filter((rc: any) => rc.visitado).length || 0
    const totalRutas = rutas?.length || 0
    const rutasFinalizadas = rutas?.filter((r: any) => r.estado === "finalizada").length || 0

    const tasaConversion = totalOportunidades > 0 ? ((ganadas / totalOportunidades) * 100).toFixed(1) : "0"
    const tasaVisitas = totalVisitas > 0 ? ((visitasRealizadas / totalVisitas) * 100).toFixed(1) : "0"
    const tasaRutas = totalRutas > 0 ? ((rutasFinalizadas / totalRutas) * 100).toFixed(1) : "0"

    const valorTotalGanado = oportunidades
      ?.filter((o: any) => o.estado === "ganada" && o.valor_estimado)
      .reduce((sum: number, o: any) => sum + (o.valor_estimado || 0), 0) || 0

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text("Análisis de Rendimiento", 14, 20)

    let yPos = 30

    doc.setFontSize(12)
    doc.text("Métricas de Conversión", 14, yPos)
    yPos += 10

    doc.setFontSize(10)
    doc.text(`Tasa de Conversión de Oportunidades: ${tasaConversion}%`, 14, yPos)
    yPos += 7
    doc.text(`Tasa de Visitas Realizadas: ${tasaVisitas}%`, 14, yPos)
    yPos += 7
    doc.text(`Tasa de Rutas Finalizadas: ${tasaRutas}%`, 14, yPos)
    yPos += 10

    doc.setFontSize(12)
    doc.text("Valores", 14, yPos)
    yPos += 10

    doc.setFontSize(10)
    doc.text(`Valor Total Ganado: $${valorTotalGanado.toLocaleString("es-AR")}`, 14, yPos)
    yPos += 7
    doc.text(`Total Oportunidades: ${totalOportunidades}`, 14, yPos)
    yPos += 7
    doc.text(`Oportunidades Ganadas: ${ganadas}`, 14, yPos)

    const blob = doc.output("blob")
    const nombreArchivo = `analisis-rendimiento-${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(nombreArchivo)
    guardarReporteEnHistorial(generarNombreReporte("rendimiento"), "rendimiento", blob)
    setSuccess("Análisis de rendimiento generado exitosamente")
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

  const tiposReportes = [
    {
      id: "resumen-ejecutivo",
      nombre: "Resumen Ejecutivo",
      descripcion: "Vista general del negocio con KPIs principales",
      icono: BarChart3,
      color: "bg-blue-500",
    },
    {
      id: "visitas",
      nombre: "Reporte de Visitas",
      descripcion: "Análisis de rutas y visitas realizadas",
      icono: MapPin,
      color: "bg-green-500",
    },
    {
      id: "pipeline",
      nombre: "Pipeline de Oportunidades",
      descripcion: "Estado y valor de oportunidades de venta",
      icono: DollarSign,
      color: "bg-yellow-500",
    },
    {
      id: "clientes",
      nombre: "Reporte de Clientes",
      descripcion: "Base de datos completa de clientes",
      icono: Users,
      color: "bg-purple-500",
    },
    {
      id: "rendimiento",
      nombre: "Análisis de Rendimiento",
      descripcion: "Métricas de conversión y efectividad",
      icono: TrendingUp,
      color: "bg-red-500",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">
          Genera reportes en PDF de los datos del sistema
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-100 border border-green-200 p-3 text-sm text-green-800">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Configuración */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
            <CardDescription>
              Selecciona el rango de fechas para tu reporte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fecha-desde">Fecha desde</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      id="fecha-desde"
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={fechaDesdeDisplay}
                      onChange={(e) => {
                        const inputValue = e.target.value
                        const cleaned = inputValue.replace(/[^\d/]/g, "")
                        
                        let formatted = cleaned
                        if (cleaned.length > 2 && !cleaned.includes("/")) {
                          formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2)
                        }
                        if (formatted.length > 5 && formatted.split("/").length === 2) {
                          formatted = formatted.slice(0, 5) + "/" + formatted.slice(5, 9)
                        }
                        
                        formatted = formatted.slice(0, 10)
                        setFechaDesdeDisplay(formatted)
                        
                        const isoDate = parseDateInput(formatted)
                        if (isoDate || formatted === "") {
                          setFechaDesde(isoDate || "")
                        }
                      }}
                      onBlur={(e) => {
                        const parsed = parseDateInput(e.target.value)
                        if (parsed) {
                          setFechaDesde(parsed)
                          setFechaDesdeDisplay(formatDateForDisplay(parsed))
                        } else if (e.target.value) {
                          setFechaDesdeDisplay("")
                          setFechaDesde("")
                        }
                      }}
                      maxLength={10}
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <input
                      type="date"
                      id="fecha-desde-calendar"
                      className="absolute opacity-0 pointer-events-none w-0 h-0"
                      value={fechaDesde || ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          setFechaDesde(e.target.value)
                          setFechaDesdeDisplay(formatDateForDisplay(e.target.value))
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 flex-shrink-0"
                    onClick={() => {
                      const dateInput = document.getElementById("fecha-desde-calendar") as HTMLInputElement
                      if (dateInput) {
                        if (dateInput.showPicker) {
                          dateInput.showPicker()
                        } else {
                          dateInput.click()
                        }
                      }
                    }}
                    title="Seleccionar fecha"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha-hasta">Fecha hasta</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      id="fecha-hasta"
                      type="text"
                      placeholder="dd/mm/yyyy"
                      value={fechaHastaDisplay}
                      onChange={(e) => {
                        const inputValue = e.target.value
                        const cleaned = inputValue.replace(/[^\d/]/g, "")
                        
                        let formatted = cleaned
                        if (cleaned.length > 2 && !cleaned.includes("/")) {
                          formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2)
                        }
                        if (formatted.length > 5 && formatted.split("/").length === 2) {
                          formatted = formatted.slice(0, 5) + "/" + formatted.slice(5, 9)
                        }
                        
                        formatted = formatted.slice(0, 10)
                        setFechaHastaDisplay(formatted)
                        
                        const isoDate = parseDateInput(formatted)
                        if (isoDate || formatted === "") {
                          setFechaHasta(isoDate || "")
                        }
                      }}
                      onBlur={(e) => {
                        const parsed = parseDateInput(e.target.value)
                        if (parsed) {
                          setFechaHasta(parsed)
                          setFechaHastaDisplay(formatDateForDisplay(parsed))
                        } else if (e.target.value) {
                          setFechaHastaDisplay("")
                          setFechaHasta("")
                        }
                      }}
                      maxLength={10}
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <input
                      type="date"
                      id="fecha-hasta-calendar"
                      className="absolute opacity-0 pointer-events-none w-0 h-0"
                      value={fechaHasta || ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          setFechaHasta(e.target.value)
                          setFechaHastaDisplay(formatDateForDisplay(e.target.value))
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 flex-shrink-0"
                    onClick={() => {
                      const dateInput = document.getElementById("fecha-hasta-calendar") as HTMLInputElement
                      if (dateInput) {
                        if (dateInput.showPicker) {
                          dateInput.showPicker()
                        } else {
                          dateInput.click()
                        }
                      }
                    }}
                    title="Seleccionar fecha"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-4">Vista rápida del período</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Clientes</p>
                  <p className="text-2xl font-bold">{vistaRapida.clientes}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rutas</p>
                  <p className="text-2xl font-bold">{vistaRapida.rutas}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Oportunidades</p>
                  <p className="text-2xl font-bold">{vistaRapida.oportunidades}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ganadas</p>
                  <p className="text-2xl font-bold text-green-600">{vistaRapida.ganadas}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel de Tipos de Reportes */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Reportes</CardTitle>
            <CardDescription>
              Selecciona el tipo de reporte que deseas generar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tiposReportes.map((reporte) => {
              const Icono = reporte.icono
              const isGenerating = generating === reporte.id
              return (
                <div
                  key={reporte.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className={`${reporte.color} p-3 rounded-lg flex-shrink-0`}>
                    <Icono className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{reporte.nombre}</p>
                    <p className="text-xs text-muted-foreground">{reporte.descripcion}</p>
                  </div>
                  <Button
                    onClick={() => generarPDF(reporte.id)}
                    disabled={isGenerating || !!generating}
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Generar PDF
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Reportes Recientes */}
      {reportesRecientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reportes Recientes</CardTitle>
            <CardDescription>
              Historial de reportes generados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reportesRecientes.map((reporte) => (
                <div
                  key={reporte.id}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    // Regenerar el reporte cuando se hace clic
                    generarPDF(reporte.tipo)
                  }}
                >
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{reporte.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(reporte.fecha)} • {reporte.tamaño}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      generarPDF(reporte.tipo)
                    }}
                    title="Descargar reporte"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
