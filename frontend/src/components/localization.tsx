"use client"

import React from "react"
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type Locale = "ru" | "en"

type Dict = Record<string, string>

const DICTS: Record<Locale, Dict> = {
  ru: {
    therapist_dashboard: "Кабинет логопеда",
    therapist_subtitle: "Управление упражнениями и прогрессом детей",
    tab_overview: "Обзор",
    tab_children: "Дети",
    tab_generator: "Генератор",
    tab_constructor: "Конструктор",
    tab_blocks: "Блоки",
    tab_sessions: "Сессии",
    choose_child: "Выберите ребенка",
    choose_child_hint: "Сначала выберите ребенка для генерации персонализированных упражнений",
    choose_child_btn: "Выбрать ребенка",
    session_for: "Сессия для",
    change_child: "Изменить ребенка",
    new_child: "Новый ребенок",
    total_children: "Всего детей",
    active_sessions: "Активных сессий",
    avg_progress: "Средний прогресс",
    achievements: "Достижения",
    recent_sessions: "Недавние сессии",
    no_sessions_yet: "Пока нет завершенных сессий",
    sessions_history: "История сессий",
    sessions_history_sub: "Все завершенные упражнения и их результаты",
  },
  en: {
    therapist_dashboard: "Therapist Dashboard",
    therapist_subtitle: "Manage exercises and children progress",
    tab_overview: "Overview",
    tab_children: "Children",
    tab_generator: "Generator",
    tab_constructor: "Constructor",
    tab_blocks: "Blocks",
    tab_sessions: "Sessions",
    choose_child: "Select a child",
    choose_child_hint: "Select a child first to generate personalized exercises",
    choose_child_btn: "Select child",
    session_for: "Session for",
    change_child: "Change child",
    new_child: "New child",
    total_children: "Total children",
    active_sessions: "Active sessions",
    avg_progress: "Average progress",
    achievements: "Achievements",
    recent_sessions: "Recent sessions",
    no_sessions_yet: "No sessions yet",
    sessions_history: "Sessions history",
    sessions_history_sub: "All finished exercises and results",
  }
}

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (k: keyof typeof DICTS["ru"]) => string
}

const I18nContext = React.createContext<I18nContextValue | null>(null)

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  // Important: keep server and client initial render identical to avoid hydration mismatch
  const [locale, setLocale] = React.useState<Locale>('ru')

  // After mount, read saved locale and update state
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('locale') as Locale | null
    if (saved && (saved === 'ru' || saved === 'en')) {
      setLocale((current) => (current === saved ? current : saved))
    }
  }, [])

  // Persist changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('locale', locale)
    }
  }, [locale])

  const t = React.useCallback((k: keyof typeof DICTS["ru"]) => {
    return DICTS[locale][k] ?? DICTS['ru'][k] ?? String(k)
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = React.useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within LocalizationProvider')
  return ctx
}

export function LangToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')}
      aria-label="Toggle language"
      className={cn('h-9 px-3', className)}
    >
      <span className="font-semibold tracking-wide" suppressHydrationWarning>
        {locale.toUpperCase()}
      </span>
    </Button>
  )
}
