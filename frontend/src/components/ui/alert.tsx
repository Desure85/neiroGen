import * as React from 'react'

import { cn } from '@/lib/utils'

const alertVariants = {
  default: 'bg-muted text-foreground',
  success: 'border border-green-500/30 bg-green-500/10 text-green-800 dark:text-green-200',
  destructive: 'border border-destructive/30 bg-destructive/10 text-destructive',
  warning: 'border border-yellow-500/30 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200',
  info: 'border border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-200',
} as const

type AlertVariant = keyof typeof alertVariants

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant
  icon?: React.ReactNode
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(({ className, variant = 'default', icon, children, ...properties }, reference) => {
  return (
    <div
      ref={reference}
      role={variant === 'destructive' ? 'alert' : 'status'}
      className={cn(
        'relative flex w-full items-start gap-3 rounded-md px-3 py-2 text-sm shadow-sm transition-colors',
        alertVariants[variant],
        className
      )}
      {...properties}
    >
      {icon ? <span className="mt-0.5 text-base">{icon}</span> : null}
      <div className="flex-1 space-y-1">
        {children}
      </div>
    </div>
  )
})

Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...properties }, reference) => (
  <p ref={reference} className={cn('font-medium leading-none tracking-tight', className)} {...properties} />
))

AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...properties }, reference) => (
  <p ref={reference} className={cn('text-sm text-muted-foreground', className)} {...properties} />
))

AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
