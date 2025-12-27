"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function PreventBack() {
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const checkAndPrevent = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Si estás en el home del dashboard, prevenir completamente el retroceso
      if (pathname === "/dashboard") {
        // Agregar una entrada al historial para que el retroceso no salga de la app
        window.history.pushState(null, "", window.location.href)
        
        const handlePopState = (event: PopStateEvent) => {
          // Prevenir el retroceso y mantener en el dashboard
          window.history.pushState(null, "", window.location.href)
        }

        window.addEventListener("popstate", handlePopState)

        return () => {
          window.removeEventListener("popstate", handlePopState)
        }
      }
    }

    checkAndPrevent()
  }, [pathname, supabase.auth])

  return null
}

