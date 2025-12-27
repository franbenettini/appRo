"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Building2,
  Menu,
  Users,
  MapPin,
  TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarToggle } from "@/components/sidebar-toggle"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clientes", href: "/dashboard/clients", icon: Building2 },
  { name: "Visitas", href: "/dashboard/visitas", icon: MapPin },
  { name: "Oportunidades", href: "/dashboard/oportunidades", icon: TrendingUp },
]

interface SidebarProps {
  className?: string
  onClose?: () => void
  isCollapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ className, onClose, isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data: userData, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single()

        if (!error && userData?.role === "admin") {
          setIsAdmin(true)
        }
      } catch (error) {
        console.error("Error checking admin role:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAdminRole()
  }, [supabase])

  return (
    <div className={cn("relative flex h-full flex-col bg-card border-r border-border transition-all duration-300", isCollapsed ? "w-16" : "w-64", className)}>
      <div className="flex h-16 items-center justify-center border-b border-border bg-primary/10 px-6">
        <div className={cn("relative w-auto", isCollapsed ? "h-14" : "h-12")}>
          <Image
            src={isCollapsed ? "/logo chico.jpeg" : "/logo.jpeg"}
            alt="Logo de la empresa"
            width={isCollapsed ? 56 : 180}
            height={isCollapsed ? 56 : 48}
            priority
            className="h-full w-auto object-contain [filter:brightness(1.05)_contrast(1.15)_saturate(1.1)] [mix-blend-mode:multiply] dark:[filter:brightness(0.95)_contrast(1.1)] dark:[mix-blend-mode:screen]"
          />
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>
      
      {/* Opción de administración al final, solo para admins */}
      {!loading && isAdmin && (
        <div className="border-t border-border px-3 py-2">
          <Link
            href="/dashboard/admin"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              pathname === "/dashboard/admin"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? "Gestionar usuarios" : undefined}
          >
            <Users className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Gestionar usuarios</span>}
          </Link>
        </div>
      )}

      {onToggle && (
        <SidebarToggle isCollapsed={isCollapsed} onToggle={onToggle} />
      )}
    </div>
  )
}

