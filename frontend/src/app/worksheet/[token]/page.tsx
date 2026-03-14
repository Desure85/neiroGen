"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { getWorksheetByShareToken, uploadCompletedWorksheet } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, CheckCircle, Loader2, AlertCircle } from "lucide-react"

interface WorksheetItem {
  id: number
  title: string
  instructions: string[]
  content_snapshot: Record<string, unknown>
}

interface Child {
  id: number
  name: string
  age?: number
}

interface WorksheetData {
  id: number
  title: string
  format: string
  copies: number
  notes?: string
  pdf_path?: string
  meta?: Record<string, unknown>
  child?: Child
  items: WorksheetItem[]
}

export default function WorksheetPage() {
  const params = useParams()
  const token = params?.token as string
  
  const [worksheet, setWorksheet] = useState<WorksheetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) return
    
    async function loadWorksheet() {
      try {
        const data = await getWorksheetByShareToken(token)
        setWorksheet(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить лист заданий")
      } finally {
        setLoading(false)
      }
    }
    
    loadWorksheet()
  }, [token])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    
    setUploading(true)
    setUploadError(null)
    
    try {
      await uploadCompletedWorksheet(token, file)
      setUploadSuccess(true)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Ошибка загрузки")
    } finally {
      setUploading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Загрузка листа заданий...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Ошибка</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!worksheet) return null

  const isCompleted = worksheet.meta?.completed_at

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle className="text-2xl">{worksheet.title}</CardTitle>
            {worksheet.child && (
              <p className="text-blue-100">
                Для: {worksheet.child.name}
                {worksheet.child.age && ` (${worksheet.child.age} лет)`}
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={handlePrint} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Распечатать
              </Button>
              
              {worksheet.pdf_path && (
                <a 
                  href={worksheet.pdf_path} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Скачать PDF
                </a>
              )}
              
              {!isCompleted && (
                <Button onClick={handleUploadClick} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Загрузить выполненную работу
                    </>
                  )}
                </Button>
              )}
              
              {isCompleted && (
                <div className="flex items-center text-green-600 bg-green-50 px-4 py-2 rounded-md">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Работа загружена
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {uploadError && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {uploadError}
              </div>
            )}
            
            {uploadSuccess && (
              <div className="mt-4 p-3 bg-green-50 text-green-600 rounded-md flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Спасибо! Работа успешно загружена.
              </div>
            )}
            
            {worksheet.notes && (
              <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-md">
                <strong>Notes:</strong> {worksheet.notes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Инструкции</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Распечатайте этот лист</li>
              <li>Пусть ребёнок выполнит задания</li>
              <li>После выполнения сфотографируйте результат</li>
              <li>Загрузите фото через кнопку выше</li>
            </ol>
          </CardContent>
        </Card>

        {/* Items */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Задания</h2>
          {worksheet.items.map((item, index) => (
            <Card key={item.id} className="break-inside-avoid">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-blue-600">
                  Задание {index + 1}: {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {item.instructions && item.instructions.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Инструкции:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-gray-600">
                      {item.instructions.map((inst, i) => (
                        <li key={i}>{inst}</li>
                      ))}
                    </ol>
                  </div>
                )}
                
                {/* Empty space for child's work */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg h-48 flex items-center justify-center text-gray-400 bg-gray-50">
                  Место для выполнения задания
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Лист заданий создан в neiroGen</p>
          <p>Формат: {worksheet.format} • Копий: {worksheet.copies}</p>
        </div>
      </div>
    </div>
  )
}
