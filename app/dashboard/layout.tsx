import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SidebarWrapper } from "@/components/sidebar-wrapper"
import { MobileNav } from "@/components/mobile-nav"
import { UserMenu } from "@/components/user-menu"
import { PreventBack } from "@/components/prevent-back"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <PreventBack />
      {/* Sidebar Desktop */}
      <SidebarWrapper />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-6 shadow-sm">
          <MobileNav />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>

        {/* User Menu - Fixed on the right side */}
        <div className="fixed top-4 right-4 z-50">
          <UserMenu email={user.email || ""} />
        </div>
      </div>
    </div>
  )
}

