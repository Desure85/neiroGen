"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { PropsWithChildren } from "react"
import { cn } from "@/lib/utils"
import ProtectedRoute from "@/components/protected-route"

type NavSection = {
  title: string
  items: { href: string; label: string; description?: string }[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Обзор",
    items: [
      { href: "/admin", label: "Дашборд" },
      { href: "/admin/assignments", label: "Задания" },
      { href: "/admin/comfy", label: "ComfyUI" },
    ],
  },
  {
    title: "Справочники",
    items: [
      { href: "/admin/exercise-types", label: "Типы упражнений", description: "Структура шаблонов" },
      { href: "/admin/exercises", label: "Упражнения" },
      { href: "/admin/worksheets", label: "Карточки" },
      { href: "/admin/content-blocks", label: "Контент-блоки" },
    ],
  },
  {
    title: "Настройки",
    items: [
      { href: "/admin/integrations", label: "Интеграции" },
      { href: "/admin/users", label: "Пользователи" },
      { href: "/admin/settings", label: "Системные" },
    ],
  },
]

export default function AdminLayout({ children }: PropsWithChildren) {
  const pathname = usePathname()

  return (
    <ProtectedRoute allowedRoles={["admin"]} unauthorizedRedirectTo="/therapist">
      <div className="flex min-h-screen bg-muted/20">
        <aside className="hidden w-72 shrink-0 border-r border-border bg-background/80 backdrop-blur lg:flex">
          <div className="flex h-full w-full flex-col">
            <div className="border-b border-border px-6 py-6">
              <h1 className="text-lg font-semibold leading-tight">Администрирование</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Управление справочниками, генерацией и настройками системы
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <nav className="space-y-6">
                {NAV_SECTIONS.map((section) => (
                  <div key={section.title} className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.title}
                    </div>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "block rounded-md border px-3 py-2 text-sm transition-colors",
                              isActive
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground"
                            )}
                          >
                            <div className="font-medium leading-tight">{item.label}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground">{item.description}</div>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
            <div className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
              © {new Date().getFullYear()} NeiroGen Admin
            </div>
          </div>
        </aside>

        <div className="flex w-full flex-col lg:pl-0">
          <header className="border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
            <div className="px-4 py-4">
              <h1 className="text-lg font-semibold">Администрирование</h1>
              <p className="text-xs text-muted-foreground">
                Навигация доступна на широком экране, на мобильном используйте меню
              </p>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
