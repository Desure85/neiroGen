"use client"

import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type ListHeaderProps = {
  title: ReactNode
  description?: ReactNode
  meta?: ReactNode
  filters?: ReactNode
  actions?: ReactNode
  className?: string
  titleClassName?: string
  descriptionClassName?: string
  metaClassName?: string
  filtersClassName?: string
  actionsClassName?: string
  direction?: "column" | "row"
}

export function ListHeader({
  title,
  description,
  meta,
  filters,
  actions,
  className,
  titleClassName,
  descriptionClassName,
  metaClassName,
  filtersClassName,
  actionsClassName,
  direction = "column",
}: ListHeaderProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        direction === "row" && "sm:items-center",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="space-y-1">
          <h2 className={cn("text-2xl font-semibold tracking-tight text-foreground", titleClassName)}>
            {title}
          </h2>
          {description ? (
            <p className={cn("text-sm text-muted-foreground", descriptionClassName)}>{description}</p>
          ) : null}
        </div>
        {meta ? (
          <div className={cn("text-xs uppercase tracking-wide text-muted-foreground", metaClassName)}>{meta}</div>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {filters ? (
          <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", filtersClassName)}>{filters}</div>
        ) : null}
        {actions ? (
          <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", actionsClassName)}>{actions}</div>
        ) : null}
      </div>
    </div>
  )
}
