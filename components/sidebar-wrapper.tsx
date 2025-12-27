"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"

export function SidebarWrapper() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Cargar el estado del sidebar desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }
  }, [])

  // Guardar el estado en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(isCollapsed))
  }, [isCollapsed])

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <aside className="hidden md:flex md:flex-col">
      <Sidebar isCollapsed={isCollapsed} onToggle={handleToggle} />
    </aside>
  )
}

