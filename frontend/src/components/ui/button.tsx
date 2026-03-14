import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Medical app variants
        medical: "bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg",
        success: "bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg",
        warning: "bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-4 py-2 rounded-lg",
        info: "bg-sky-500 hover:bg-sky-600 text-white font-medium px-4 py-2 rounded-lg",
        // Child-friendly variant
        child: "bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-bold py-3 px-6 rounded-full text-lg shadow-lg transform hover:scale-105 transition-all duration-200",
        // Difficulty badges
        difficultyEasy: "bg-green-100 text-green-800 hover:bg-green-200 px-3 py-1 rounded-full text-sm font-medium",
        difficultyMedium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 px-3 py-1 rounded-full text-sm font-medium",
        difficultyHard: "bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded-full text-sm font-medium",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        xs: "h-8 px-2 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
