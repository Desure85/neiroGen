import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { LocalizationProvider } from '@/components/localization'
import { Header } from '@/components/header'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'NeuroGen - Speech Therapy Exercises',
  description: 'Application for generating neuro-speech therapy exercises',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Early theme script to avoid flicker on first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try {
  var t = localStorage.getItem('theme');
  if (!t) { t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  if (t === 'dark') { document.documentElement.classList.add('dark'); }
} catch (e) {} })();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 text-foreground font-sans antialiased">
        <LocalizationProvider>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <Header />
              {children}
            </ThemeProvider>
          </AuthProvider>
        </LocalizationProvider>
      </body>
    </html>
  )
}
