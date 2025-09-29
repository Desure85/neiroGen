"use client"

import * as React from "react"

export type ThemeProviderProps = React.PropsWithChildren<{
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}>

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>
}
