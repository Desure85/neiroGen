"use client"

import { forwardRef, type ComponentProps, type ReactNode } from "react"
import { Tabs } from "@/components/ui/tabs"
import { DashboardTabsList, type DashboardTabsListProps } from "@/components/dashboard-tabs-list"
import { cn } from "@/lib/utils"

export type DashboardTabsGroupItem = DashboardTabsListProps["items"][number]

type TabsRootProps = ComponentProps<typeof Tabs>

export type DashboardTabsGroupProps = TabsRootProps & {
  items: DashboardTabsGroupItem[]
  variant?: DashboardTabsListProps["variant"]
  columnsClassName?: string
  listClassName?: string
  triggerClassName?: string
  baseClassName?: string
  tabsWrapperClassName?: string
  listProps?: Omit<DashboardTabsListProps, "items" | "variant" | "columnsClassName" | "className" | "triggerClassName" | "baseClassName">
  children?: ReactNode
}

export const DashboardTabsGroup = forwardRef<HTMLDivElement, DashboardTabsGroupProps>(
  (
    {
      items,
      className,
      variant = "primary",
      columnsClassName,
      listClassName,
      triggerClassName,
      baseClassName,
      tabsWrapperClassName,
      listProps,
      children,
      ...tabsProps
    },
    ref
  ) => {
    return (
      <Tabs ref={ref} className={cn("w-full", className)} {...tabsProps}>
        <div className={cn("w-full", tabsWrapperClassName)}>
          <DashboardTabsList
            items={items}
            variant={variant}
            columnsClassName={columnsClassName}
            className={listClassName}
            triggerClassName={triggerClassName}
            baseClassName={baseClassName}
            {...listProps}
          />
        </div>
        {children}
      </Tabs>
    )
  }
)

DashboardTabsGroup.displayName = "DashboardTabsGroup"
