"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, type PropsWithChildren } from "react"

import { Button } from "@/components/ui/button"
import ProtectedRoute from "@/components/protected-route"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardTabsGroup } from "@/components/dashboard-tabs-group"

type AdminSection = {
  key: string
  label: string
  items: { href: string; label: string }[]
  cta?: { href: string; label: string }
}

const ADMIN_SECTIONS: AdminSection[] = [
  {
    key: "overview",
    label: "Обзор",
    items: [
      { href: "/admin", label: "Дашборд" },
      { href: "/admin/assignments", label: "Задания" },
      { href: "/admin/comfy", label: "ComfyUI" },
    ],
  },
  {
    key: "catalogs",
    label: "Справочники",
    items: [
      { href: "/admin/exercise-types", label: "Типы упражнений" },
      { href: "/admin/exercises", label: "Упражнения" },
      { href: "/admin/worksheets", label: "Карточки" },
      { href: "/admin/content-blocks", label: "Контент-блоки" },
    ],
    cta: { href: "/admin/exercise-types/new", label: "Создать тип" },
  },
  {
    key: "settings",
    label: "Настройки",
    items: [
      { href: "/admin/users", label: "Пользователи" },
      { href: "/admin/integrations", label: "Интеграции" },
      { href: "/admin/settings", label: "Системные" },
    ],
  },
]

function normalizePath(value: string | null) {
  if (!value) return null
  const withoutQuery = value.split("?")[0]
  return withoutQuery.endsWith("/") && withoutQuery !== "/"
    ? withoutQuery.slice(0, -1)
    : withoutQuery
}

function matchPath(pathname: string | null, href: string) {
  const current = normalizePath(pathname)
  const target = normalizePath(href)
  if (!current || !target) return false
  if (current === target) return true
  if (current.startsWith(`${target}/`)) return true

  const currentSegments = current.replace(/^\/+/, "").split("/")
  const targetSegments = target.replace(/^\/+/, "").split("/")

  if (currentSegments.length >= targetSegments.length) {
    const tail = currentSegments.slice(-targetSegments.length).join("/")
    if (tail === targetSegments.join("/")) {
      return true
    }
  }

  return false
}

function findActiveSection(pathname: string | null): AdminSection {
  if (!pathname) return ADMIN_SECTIONS[0]

  let bestMatch: { section: AdminSection; hrefLength: number } | null = null

  for (const section of ADMIN_SECTIONS) {
    for (const item of section.items) {
      if (matchPath(pathname, item.href)) {
        const length = item.href.length
        if (!bestMatch || length > bestMatch.hrefLength) {
          bestMatch = { section, hrefLength: length }
        }
      }
    }
  }

  return bestMatch?.section ?? ADMIN_SECTIONS[0]
}

function findActiveItem(section: AdminSection, pathname: string | null) {
  if (!pathname) return section.items[0]

  let bestItem = section.items[0]
  let bestLength = bestItem.href.length

  for (const item of section.items) {
    if (matchPath(pathname, item.href)) {
      const length = item.href.length
      if (length >= bestLength) {
        bestItem = item
        bestLength = length
      }
    }
  }

  return bestItem
}

export default function AdminLayout({ children }: PropsWithChildren) {
  const pathname = usePathname()
  const router = useRouter()
  const activeSection = findActiveSection(pathname)
  const activeItem = findActiveItem(activeSection, pathname)
  const sectionTabs = ADMIN_SECTIONS.map((section) => ({
    value: section.key,
    label: section.label,
  }))
  const subSectionTabs = activeSection.items.map((item) => ({
    value: item.href,
    label: item.label,
  }))

  const handleSectionChange = useCallback(
    (value: string) => {
      const section = ADMIN_SECTIONS.find((item) => item.key === value)
      const targetHref = section?.items[0]?.href
      if (targetHref && targetHref !== pathname) {
        router.push(targetHref)
      }
    },
    [router, pathname]
  )

  const handleSubSectionChange = useCallback(
    (value: string) => {
      if (value && value !== pathname) {
        router.push(value)
      }
    },
    [router, pathname]
  )

  return (
    <ProtectedRoute allowedRoles={["admin"]} unauthorizedRedirectTo="/therapist">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
        <DashboardHeader
          badge="Кабинет администратора"
          title="Управление NeiroGen"
          description="Управление упражнениями, контентом и правами пользователей"
          actions={
            activeSection.cta ? (
              <Button asChild size="sm" className="whitespace-nowrap">
                <Link href={activeSection.cta.href}>{activeSection.cta.label}</Link>
              </Button>
            ) : null
          }
        />

        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <DashboardTabsGroup
            value={activeSection.key}
            onValueChange={handleSectionChange}
            items={sectionTabs}
            variant="primary"
          />

          <DashboardTabsGroup
            value={activeItem?.href ?? ""}
            onValueChange={handleSubSectionChange}
            items={subSectionTabs}
            variant="primary"
          />
        </div>

        <main className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}
