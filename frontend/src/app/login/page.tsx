"use client"

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { apiFetch, ensureCsrfCookie } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Eye, EyeOff, UserCircle, Stethoscope } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, refresh, setUser, loading: authLoading } = useAuth()
  const [email, setEmail] = React.useState('admin@example.com')
  const [password, setPassword] = React.useState('password')
  const [showPassword, setShowPassword] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [role, setRole] = React.useState<'therapist' | 'patient'>('therapist')
  const [showRolePicker, setShowRolePicker] = React.useState(false)
  const emailInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    emailInputRef.current?.focus()
  }, [])

  React.useEffect(() => {
    if (authLoading) return
    if (user) {
      const redirectParam = searchParams.get('redirect')
      const target = redirectParam && !redirectParam.startsWith('/login') ? redirectParam : '/therapist'
      router.replace(target)
    }
  }, [user, authLoading, router, searchParams])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await ensureCsrfCookie()
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.message || `HTTP ${res.status}`)
      }
      const data = await res.json().catch(() => null)
      if (data && data.user) {
        setUser(data.user)
      } else {
        await refresh()
      }
      const redirectParam = searchParams.get('redirect')
      const target = redirectParam && !redirectParam.startsWith('/login') ? redirectParam : '/therapist'
      router.replace(target)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const handleOAuthLogin = (provider: 'google' | 'vk') => {
    setShowRolePicker(true)
  }

  const handleOAuthContinue = async () => {
    // TODO: Implement actual OAuth flow
    // For now, just show a message
    alert(`OAuth через ${role === 'therapist' ? 'Google' : 'VK'} будет реализован в следующей версии`)
    setShowRolePicker(false)
  }

  if (!authLoading && user) {
    return null
  }

  if (showRolePicker) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-card border border-border">
          <CardHeader>
            <CardTitle>Выберите роль</CardTitle>
            <CardDescription>Как вы хотите использовать систему?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={role} onValueChange={(v) => setRole(v as 'therapist' | 'patient')}>
              <RadioGroupItem value="therapist">
                <div className="flex items-center gap-3 w-full">
                  <Stethoscope className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">Я логопед</div>
                    <div className="text-xs text-gray-500">Создавать упражнения и вести пациентов</div>
                  </div>
                </div>
              </RadioGroupItem>
              <RadioGroupItem value="patient">
                <div className="flex items-center gap-3 w-full">
                  <UserCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-semibold">Я пациент</div>
                    <div className="text-xs text-gray-500">Выполнять упражнения по коду сессии</div>
                  </div>
                </div>
              </RadioGroupItem>
            </RadioGroup>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowRolePicker(false)}
                className="w-full"
              >
                Назад
              </Button>
              <Button 
                onClick={handleOAuthContinue}
                className="w-full"
              >
                Продолжить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-card border border-border">
        <CardHeader>
          <CardTitle>Вход</CardTitle>
          <CardDescription>Войдите в систему, чтобы продолжить</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OAuth buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-2"
              onClick={() => handleOAuthLogin('google')}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Войти через Google
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-2"
              onClick={() => handleOAuthLogin('vk')}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#0077FF">
                <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.131-.427.131-.427s-.019-1.304.587-1.496c.597-.19 1.364 1.26 2.177 1.818.614.421 1.08.329 1.08.329l2.169-.03s1.135-.07.597-.963c-.044-.073-.314-.662-1.617-1.87-1.364-1.264-1.181-1.059.462-3.244.999-1.33 1.398-2.14 1.273-2.488-.119-.332-.854-.244-.854-.244l-2.443.015s-.181-.025-.315.056c-.131.079-.216.263-.216.263s-.387 1.03-.903 1.906c-1.088 1.85-1.524 1.948-1.701 1.833-.412-.267-.309-1.073-.309-1.645 0-1.788.271-2.532-.529-2.725-.266-.064-.461-.106-1.14-.113-.87-.009-1.605.003-2.021.207-.277.136-.491.439-.361.456.161.022.525.098.718.361.249.34.24 1.104.24 1.104s.143 2.105-.334 2.365c-.328.179-.777-.186-1.742-1.857-.494-.85-.867-1.79-.867-1.79s-.072-.176-.2-.271c-.155-.114-.372-.15-.372-.15l-2.321.015s-.349.01-.477.161c-.114.134-.009.411-.009.411s1.816 4.25 3.873 6.397c1.885 1.969 4.022 1.84 4.022 1.84h.971z"/>
              </svg>
              Войти через ВКонтакте
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Или используйте email</span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-muted-foreground" htmlFor="email">Email</label>
              <Input
                id="email"
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                aria-label="Email address"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm text-muted-foreground" htmlFor="password">Пароль</label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => alert('Функция восстановления пароля в разработке')}
                >
                  Забыли пароль?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  aria-label="Password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Входим…' : 'Войти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
