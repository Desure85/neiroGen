import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Difficulty levels
        easy: "border-transparent bg-green-100 text-green-800 hover:bg-green-200",
        medium: "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        hard: "border-transparent bg-red-100 text-red-800 hover:bg-red-200",
        // Status variants
        success: "border-transparent bg-green-50 text-green-700 hover:bg-green-100",
        warning: "border-transparent bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
        info: "border-transparent bg-blue-50 text-blue-700 hover:bg-blue-100",
        error: "border-transparent bg-red-50 text-red-700 hover:bg-red-100",
        // Content block types
        text: "border-transparent bg-blue-100 text-blue-800",
        image: "border-transparent bg-green-100 text-green-800",
        audio: "border-transparent bg-purple-100 text-purple-800",
        video: "border-transparent bg-red-100 text-red-800",
        interactive: "border-transparent bg-yellow-100 text-yellow-800",
        drawing: "border-transparent bg-pink-100 text-pink-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
