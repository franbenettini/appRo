export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  CLIENTS: "/dashboard/clients",
  USERS: "/dashboard/users",
  NOTES: "/dashboard/notes",
} as const

export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
} as const

export const CLIENT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  LEAD: "lead",
} as const

