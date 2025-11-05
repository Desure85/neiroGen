"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type DashboardHeaderProps = {
  title: ReactNode
  description?: ReactNode
  badge?: ReactNode
  actions?: ReactNode
  className?: string
  contentClassName?: string
  headingClassName?: string
}

export function DashboardHeader({
  title,
  description,
  badge,
  actions,
  className,
  contentClassName,
  headingClassName,
}: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        "bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border/40",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8",
          contentClassName
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className={cn("space-y-2", headingClassName)}>
            {badge ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {badge}
              </div>
            ) : null}
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {title}
              </h1>
              {description ? (
                <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
