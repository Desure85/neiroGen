import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormFieldProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  label: string
  children: React.ReactNode
  description?: string
  error?: string
}

function FormField({
  label,
  children,
  description,
  error,
  className,
  id,
  ...props
}: FormFieldProps) {
  const inputId = id || `form-field-${React.useId()}`
  
  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={inputId}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        {...props}
      >
        {label}
      </label>
      {React.isValidElement(children) 
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id: inputId })
        : children
      }
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

export { FormField }
