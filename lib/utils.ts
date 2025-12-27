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

