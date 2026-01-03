import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea una fecha en formato DD/MM/YYYY
 * @param date - Fecha como string (YYYY-MM-DD o ISO), Date object, o null/undefined
 * @returns String en formato DD/MM/YYYY o "-" si la fecha es inválida
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-"
  
  try {
    let dateObj: Date
    
    if (typeof date === "string") {
      // Si es formato YYYY-MM-DD, parsearlo directamente sin zona horaria
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split("-").map(Number)
        dateObj = new Date(year, month - 1, day)
      } else {
        dateObj = new Date(date)
      }
    } else {
      dateObj = date
    }
    
    if (isNaN(dateObj.getTime())) return "-"
    
    const day = String(dateObj.getDate()).padStart(2, "0")
    const month = String(dateObj.getMonth() + 1).padStart(2, "0")
    const year = dateObj.getFullYear()
    
    return `${day}/${month}/${year}`
  } catch {
    return "-"
  }
}

/**
 * Convierte una fecha en formato DD/MM/YYYY a YYYY-MM-DD
 * @param dateString - Fecha en formato DD/MM/YYYY
 * @returns String en formato YYYY-MM-DD o null si es inválida
 */
export function parseDateInput(dateString: string): string | null {
  if (!dateString) return null
  const parts = dateString.split("/")
  if (parts.length === 3 && parts[0] && parts[1] && parts[2] && parts[2].length === 4) {
    const day = parts[0].padStart(2, "0")
    const month = parts[1].padStart(2, "0")
    const year = parts[2]
    // Validar que sea una fecha real
    const date = new Date(`${year}-${month}-${day}T00:00:00Z`)
    if (isNaN(date.getTime()) || date.getUTCDate() !== parseInt(day) || date.getUTCMonth() + 1 !== parseInt(month) || date.getUTCFullYear() !== parseInt(year)) {
      return null
    }
    return `${year}-${month}-${day}`
  }
  return null
}

