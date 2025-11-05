"use client"

import { type ReactNode } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type SectionCardProps = {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
  actionsClassName?: string
  footerClassName?: string
  subdued?: boolean
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  footer,
  className,
  headerClassName,
  contentClassName,
  actionsClassName,
  footerClassName,
  subdued = false,
}: SectionCardProps) {
  return (
    <Card
      className={cn(
        "border border-border/60 shadow-sm",
        subdued && "bg-muted/40",
        className
      )}
    >
      {(title || description || actions) && (
        <CardHeader className={cn("gap-3", headerClassName)}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              {title ? <CardTitle className="text-lg font-semibold leading-snug text-foreground">{title}</CardTitle> : null}
              {description ? (
                <CardDescription className="text-sm text-muted-foreground">
                  {description}
                </CardDescription>
              ) : null}
            </div>
            {actions ? (
              <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", actionsClassName)}>
                {actions}
              </div>
            ) : null}
          </div>
        </CardHeader>
      )}
      {children ? (
        <CardContent className={cn("space-y-4", contentClassName)}>{children}</CardContent>
      ) : null}
      {footer ? (
        <CardFooter className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", footerClassName)}>
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  )
}
