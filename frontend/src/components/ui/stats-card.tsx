import * as React from "react"
import { cn } from "@/lib/utils"

interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  icon?: React.ReactNode
  variant?: "default" | "blue" | "green" | "purple" | "orange" | "yellow"
}

const statsCardVariants = {
  default: "bg-muted/50",
  blue: "bg-blue-50",
  green: "bg-green-50",
  purple: "bg-purple-50",
  orange: "bg-orange-50",
  yellow: "bg-yellow-50",
}

const statsValueVariants = {
  default: "text-foreground",
  blue: "text-blue-600",
  green: "text-green-600",
  purple: "text-purple-600",
  orange: "text-orange-600",
  yellow: "text-yellow-600",
}

const statsLabelVariants = {
  default: "text-muted-foreground",
  blue: "text-blue-600",
  green: "text-green-600",
  purple: "text-purple-600",
  orange: "text-orange-600",
  yellow: "text-yellow-600",
}

function StatsCard({
  className,
  label,
  value,
  icon,
  variant = "default",
  ...props
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-4 text-center",
        statsCardVariants[variant],
        className
      )}
      {...props}
    >
      {icon && (
        <div className={cn("mb-2", statsLabelVariants[variant])}>
          {icon}
        </div>
      )}
      <div className={cn("text-2xl font-bold", statsValueVariants[variant])}>
        {value}
      </div>
      <div className={cn("text-sm", statsLabelVariants[variant])}>
        {label}
      </div>
    </div>
  )
}

export { StatsCard, type StatsCardProps }
