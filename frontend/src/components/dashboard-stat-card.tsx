"use client"

import { type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export type DashboardStatCardProps = {
  label: ReactNode
  value: ReactNode
  icon?: ReactNode
  hint?: ReactNode
  trend?: ReactNode
  className?: string
  contentClassName?: string
  valueClassName?: string
  labelClassName?: string
  hintClassName?: string
  variant?: "default" | "accent"
  loading?: boolean
}

export function DashboardStatCard({
  label,
  value,
  icon,
  hint,
  trend,
  className,
  contentClassName,
  valueClassName,
  labelClassName,
  hintClassName,
  variant = "default",
  loading = false,
}: DashboardStatCardProps) {
  return (
    <Card
      className={cn(
        "border border-border/60 shadow-sm",
        variant === "accent" &&
          "border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/15",
        className
      )}
    >
      <CardContent
        className={cn(
          "flex flex-col gap-3 p-5",
          contentClassName
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {icon ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 text-foreground/80">
                {icon}
              </div>
            ) : null}
            <div className="space-y-1">
              <div
                className={cn(
                  "text-sm font-medium text-muted-foreground",
                  labelClassName
                )}
              >
                {label}
              </div>
              {hint ? (
                <div
                  className={cn(
                    "text-xs text-muted-foreground/80",
                    hintClassName
                  )}
                >
                  {hint}
                </div>
              ) : null}
            </div>
          </div>
          {trend ? <div className="text-xs font-medium text-muted-foreground/80">{trend}</div> : null}
        </div>
        <div
          className={cn(
            "text-3xl font-semibold tracking-tight text-foreground",
            valueClassName
          )}
        >
          {loading ? <Skeleton className="h-8 w-24" /> : value}
        </div>
      </CardContent>
    </Card>
  )
}
