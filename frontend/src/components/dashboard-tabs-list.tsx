"use client"

import * as TabsPrimitive from "@radix-ui/react-tabs"
import { TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

const GRID_CLASS_BY_COUNT: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
  9: "grid-cols-9",
  10: "grid-cols-10",
  11: "grid-cols-11",
  12: "grid-cols-12",
}

export type DashboardTabItem = {
  value: string
  label: ReactNode
  className?: string
  triggerProps?: Partial<React.ComponentProps<typeof TabsTrigger>>
}

export type DashboardTabsListProps = {
  items: DashboardTabItem[]
  className?: string
  triggerClassName?: string
  columnsClassName?: string
  baseClassName?: string
  variant?: "primary" | "secondary"
}

function getGridClass(itemsCount: number, override?: string) {
  if (override) return override
  return GRID_CLASS_BY_COUNT[itemsCount] ?? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
}

const VARIANT_BASE_CLASS: Record<NonNullable<DashboardTabsListProps["variant"]>, string> = {
  primary: "grid w-full gap-2 rounded-xl bg-muted/50 p-1 backdrop-blur supports-[backdrop-filter]:bg-muted/40",
  secondary: "grid w-full gap-2 rounded-xl bg-background/80 p-1 shadow-sm",
}

const VARIANT_TRIGGER_CLASS: Record<NonNullable<DashboardTabsListProps["variant"]>, string> = {
  primary:
    "text-sm font-medium transition-colors rounded-lg border border-transparent text-foreground/70 hover:text-foreground hover:bg-background/70 data-[state=active]:border-transparent data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold",
  secondary:
    "text-sm font-medium transition-colors rounded-lg border border-transparent text-foreground/70 hover:text-foreground/90 hover:bg-background/70 data-[state=active]:border-primary data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:font-semibold",
}

export function DashboardTabsList({
  items,
  className,
  triggerClassName,
  columnsClassName,
  baseClassName,
  variant = "primary",
}: DashboardTabsListProps) {
  const computedBase =
    baseClassName ?? VARIANT_BASE_CLASS[variant]
  const computedTriggerBase = VARIANT_TRIGGER_CLASS[variant]
  return (
    <TabsPrimitive.List
      className={cn(
        computedBase,
        getGridClass(items.length, columnsClassName),
        className
      )}
    >
      {items.map((item) => (
        <TabsTrigger
          key={item.value}
          value={item.value}
          className={cn(
            "px-4 py-2",
            computedTriggerBase,
            triggerClassName,
            item.className
          )}
          {...item.triggerProps}
        >
          {item.label}
        </TabsTrigger>
      ))}
    </TabsPrimitive.List>
  )
}
