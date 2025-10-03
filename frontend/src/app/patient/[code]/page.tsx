"use client"

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { Printer, Download, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { WorksheetLayoutCanvas } from '@/components/worksheets/worksheet-layout-canvas'

interface Session {
  id: number
  session_code: string
  child_id: number
  exercise_id: number | null
  score: number
  completed_items: number
  total_items: number
  time_spent: number
  accuracy: number
  started_at: string | null
  finished_at: string | null
  metadata: Record<string, any> | null
  child?: {
    id: number
    name: string
  }
  exercise?: {
    id: number
    title: string
    type: string
    difficulty: string
    estimated_duration: number
    content: {
      exercise_type: string
      items?: string[]
      instructions?: string[]
      worksheet_layout?: any
    }
  }
}

export default function PatientSessionPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const worksheetRef = useRef<HTMLDivElement>(null)

  // Load session by code
  useEffect(() => {
    const loadSession = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await apiFetch(`/api/sessions/code/${code}`)
        if (!res.ok) {
          throw new Error(`Сессия не найдена (${res.status})`)
        }
        const data = await res.json()
        setSession(data)
        
        // Check if already submitted
        if (data.finished_at) {
          setSubmitted(true)
        }
      } catch (e: any) {
        setError(e?.message || 'Не удалось загрузить сессию')
      } finally {
        setLoading(false)
      }
    }
    if (code) {
      loadSession()
    }
  }, [code])

  const handlePrint = () => {
    window.print()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  const handleSubmitWork = async () => {
    if (!uploadedFile || !session) return

    try {
      setUploading(true)
      
      // В реальном приложении - загрузка файла на сервер
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('session_code', code)
      
      // Mock: просто отмечаем как завершенное
      const res = await apiFetch(`/api/sessions/code/${code}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finished_at: new Date().toISOString(),
          metadata: { file_submitted: true, file_name: uploadedFile.name }
        }),
      })

      if (!res.ok) {
        throw new Error('Не удалось отправить работу')
      }

      setSubmitted(true)
    } catch (e: any) {
      alert(e?.message || 'Ошибка при отправке работы')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">Загрузка сессии...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Ошибка</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{error || 'Сессия не найдена'}</p>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <Card className="w-full max-w-md border-green-200">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-8 w-8" />
              <CardTitle className="text-2xl">Работа отправлена!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                {session.child?.name}, спасибо! Ваша работа отправлена логопеду.
              </p>
              <div className="bg-green-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Задание выполнено</span>
                </div>
                {uploadedFile && (
                  <p className="text-sm text-gray-600">
                    Файл: {uploadedFile.name}
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-500 text-center mt-4">
                Логопед проверит вашу работу и даст обратную связь
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const worksheetLayout = session.exercise?.content?.worksheet_layout

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {session.child?.name} 👋
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {session.exercise?.title}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Код сессии</p>
                <p className="text-lg font-mono font-bold text-gray-700">
                  {session.session_code}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Инструкция
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <p className="font-semibold">Как выполнить задание:</p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>
                  Нажмите кнопку <strong>&laquo;Печать листа&raquo;</strong> или <strong>&laquo;Скачать&raquo;</strong>
                </li>
                <li>Распечатайте лист с заданием</li>
                <li>Выполните задание на распечатанном листе</li>
                <li>Сфотографируйте или отсканируйте выполненную работу</li>
                <li>
                  Загрузите файл и нажмите <strong>&laquo;Отправить работу&raquo;</strong>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Worksheet Preview */}
        <Card className="print:shadow-none">
          <CardHeader className="print:hidden">
            <div className="flex items-center justify-between">
              <CardTitle>Лист с заданием</CardTitle>
              <div className="flex gap-2">
                <Button onClick={handlePrint} variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  Печать листа
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent ref={worksheetRef}>
            {worksheetLayout ? (
              <div className="bg-white border rounded-lg overflow-hidden">
                <WorksheetLayoutCanvas
                  value={worksheetLayout}
                  onChange={() => {}} 
                  exerciseType={session.exercise?.type}
                  exerciseData={session.exercise?.content}
                  instructions={session.exercise?.content?.instructions}
                />
              </div>
            ) : (
              <div className="min-h-[400px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Лист с заданием не настроен</p>
                  <p className="text-sm">Обратитесь к логопеду</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload section */}
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Отправить выполненную работу
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                Выберите фото или скан выполненного задания
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  cursor-pointer"
              />
              {uploadedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Выбран файл: {uploadedFile.name}
                </p>
              )}
            </div>
            
            <Button
              onClick={handleSubmitWork}
              disabled={!uploadedFile || uploading}
              size="lg"
              className="w-full"
            >
              {uploading ? (
                <>Отправка...</>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Отправить работу логопеду
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  )
}
