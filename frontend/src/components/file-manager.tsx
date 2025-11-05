"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { 
  Folder, 
  FileImage, 
  Trash2, 
  Download, 
  Search, 
  Grid3x3, 
  List,
  Eye,
  X,
  Calendar,
  HardDrive,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Tag,
  Plus,
  FolderTree,
  Upload,
  QrCode,
  Link as LinkIcon,
  Image as ImageIconLucide
} from 'lucide-react'
// TODO: Раскомментировать после установки библиотеки
// import QRCode from 'qrcode'

interface FileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: number
  url?: string
  thumbnail?: string
  createdAt: Date
  mimeType?: string
  parentId?: string | null
  tags?: string[]
  children?: FileItem[]
}

interface FileManagerProps {
  title?: string
  onFileSelect?: (file: FileItem) => void
  onAddToCanvas?: (file: FileItem, insertType: 'image' | 'qr' | 'link') => void
  allowMultiple?: boolean
  filterTypes?: string[]
}

export function FileManager({ 
  title = "Файловый менеджер", 
  onFileSelect,
  onAddToCanvas,
  allowMultiple = false,
  filterTypes
}: FileManagerProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'tree'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [showTagEditor, setShowTagEditor] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [showAllTags, setShowAllTags] = useState(false)
  const [tagSearchQuery, setTagSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Загрузка файлов из API
  const loadFiles = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (currentFolderId) params.append('parent_id', currentFolderId)
      if (searchQuery) params.append('search', searchQuery)
      if (selectedTags.size > 0) {
        params.append('tags', Array.from(selectedTags).join(','))
      }
      
      const response = await apiFetch(`/api/files?${params}`)
      if (!response.ok) {
        throw new Error('Failed to load files')
      }
      
      const data = await response.json()
      
      // Преобразовать даты из строк в Date объекты
      const filesWithDates = data.data.map((file: any) => ({
        ...file,
        createdAt: new Date(file.created_at),
        parentId: file.parent_id,
        mimeType: file.mime_type,
        thumbnailUrl: file.thumbnail_url,
      }))
      
      setFiles(filesWithDates)
    } catch (error) {
      console.error('Failed to load files:', error)
      setError('Не удалось загрузить файлы')
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить файлы',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentFolderId, searchQuery, selectedTags, toast])

  // Загрузка при монтировании и изменении зависимостей
  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const formatDate = (date: Date): string => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / 86400000)
    
    if (days === 0) return 'Сегодня'
    if (days === 1) return 'Вчера'
    if (days < 7) return `${days} дн. назад`
    return date.toLocaleDateString('ru-RU')
  }

  // Получить все уникальные теги
  const allTags = React.useMemo(() => {
    const tags = new Set<string>()
    files.forEach(file => {
      file.tags?.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [files])

  // Хлебные крошки (путь к текущей папке)
  const breadcrumbs = React.useMemo(() => {
    const path: FileItem[] = []
    let currentId = currentFolderId
    
    while (currentId) {
      const folder = files.find(f => f.id === currentId)
      if (!folder) break
      path.unshift(folder)
      currentId = folder.parentId || null
    }
    
    return path
  }, [files, currentFolderId])

  // Фильтрация файлов
  const filteredFiles = files.filter(file => {
    // Показываем только файлы в текущей папке
    if (file.parentId !== currentFolderId) {
      return false
    }
    
    // Поиск по названию
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    // Фильтр по типу файла
    if (filterTypes && file.type === 'file' && file.mimeType && !filterTypes.includes(file.mimeType)) {
      return false
    }
    
    // Фильтр по тегам
    if (selectedTags.size > 0 && file.type === 'file') {
      const hasAllTags = Array.from(selectedTags).every(tag => 
        file.tags?.includes(tag)
      )
      if (!hasAllTags) {
        return false
      }
    }
    
    return true
  })

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      if (!allowMultiple) {
        newSelected.clear()
      }
      newSelected.add(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'folder') {
      setCurrentFolderId(file.id)
    } else if (file.type === 'file' && file.mimeType?.startsWith('image/')) {
      setPreviewFile(file)
    } else {
      toggleFileSelection(file.id)
    }
  }

  const addTag = async (fileId: string, tag: string) => {
    if (!tag.trim()) return
    
    try {
      const response = await apiFetch(`/api/files/${fileId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tag.trim() })
      })
      
      if (!response.ok) {
        throw new Error('Failed to add tag')
      }
      
      setFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          const existingTags = f.tags || []
          if (existingTags.includes(tag)) return f
          return { ...f, tags: [...existingTags, tag] }
        }
        return f
      }))
      setNewTag('')
    } catch (error) {
      console.error('Failed to add tag:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить тег',
        variant: 'destructive',
      })
    }
  }

  const removeTag = async (fileId: string, tag: string) => {
    try {
      const response = await apiFetch(`/api/files/${fileId}/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove tag')
      }
      
      setFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          return { ...f, tags: f.tags?.filter(t => t !== tag) || [] }
        }
        return f
      }))
    } catch (error) {
      console.error('Failed to remove tag:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить тег',
        variant: 'destructive',
      })
    }
  }

  const toggleTagFilter = (tag: string) => {
    const newTags = new Set(selectedTags)
    if (newTags.has(tag)) {
      newTags.delete(tag)
    } else {
      newTags.add(tag)
    }
    setSelectedTags(newTags)
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm('Удалить файл?')) return
    
    // TODO: API call
    setFiles(prev => prev.filter(f => f.id !== fileId))
    selectedFiles.delete(fileId)
    setSelectedFiles(new Set(selectedFiles))
  }

  const handleDownload = (file: FileItem) => {
    if (file.url) {
      window.open(file.url, '_blank')
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    
    try {
      const response = await apiFetch('/api/files/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          parent_id: currentFolderId,
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create folder')
      }
      
      const data = await response.json()
      const newFolder = {
        ...data.data,
        createdAt: new Date(data.data.created_at),
        parentId: data.data.parent_id,
      }
      
      setFiles(prev => [...prev, newFolder])
      setNewFolderName('')
      setShowNewFolderDialog(false)
      
      toast({
        title: 'Успешно',
        description: `Папка "${newFolderName}" создана`,
      })
    } catch (error) {
      console.error('Failed to create folder:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать папку',
        variant: 'destructive',
      })
    }
  }

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') return <Folder className="h-5 w-5" />
    if (file.mimeType?.startsWith('image/')) return <FileImage className="h-5 w-5" />
    return <FileImage className="h-5 w-5" />
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => setCurrentFolderId(null)}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <HardDrive className="h-4 w-4" />
          <span>Все файлы</span>
        </button>
        {breadcrumbs.map((folder) => (
          <React.Fragment key={folder.id}>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => setCurrentFolderId(folder.id)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {folder.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск файлов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                title="Сетка"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                title="Список"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'tree' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('tree')}
                title="Древовидное отображение"
              >
                <FolderTree className="h-4 w-4" />
              </Button>
              
              <div className="h-8 w-px bg-border" />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewFolderDialog(true)}
                title="Создать папку"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.multiple = true
                  input.accept = 'image/*,application/pdf,audio/*'
                  input.onchange = async (e) => {
                    const files = (e.target as HTMLInputElement).files
                    if (!files) return
                    
                    setUploadProgress(0)
                    
                    try {
                      const formData = new FormData()
                      for (let i = 0; i < files.length; i++) {
                        formData.append('files[]', files[i])
                      }
                      if (currentFolderId) {
                        formData.append('parent_id', currentFolderId)
                      }
                      
                      const response = await apiFetch('/api/files/upload', {
                        method: 'POST',
                        body: formData,
                      })
                      
                      if (!response.ok) {
                        throw new Error('Failed to upload files')
                      }
                      
                      const data = await response.json()
                      const uploadedFiles = data.data.map((file: any) => ({
                        ...file,
                        createdAt: new Date(file.created_at),
                        parentId: file.parent_id,
                        mimeType: file.mime_type,
                        thumbnailUrl: file.thumbnail_url,
                      }))
                      
                      setFiles(prev => [...prev, ...uploadedFiles])
                      setUploadProgress(null)
                      
                      toast({
                        title: '\u0423\u0441\u043f\u0435\u0448\u043d\u043e',
                        description: `\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u043e ${files.length} \u0444\u0430\u0439\u043b(\u043e\u0432)`,
                      })
                    } catch (error) {
                      console.error('Failed to upload files:', error)
                      setUploadProgress(null)
                      toast({
                        title: '\u041e\u0448\u0438\u0431\u043a\u0430',
                        description: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0444\u0430\u0439\u043b\u044b',
                        variant: 'destructive',
                      })
                    }
                  }
                  input.click()
                }}
                title="Загрузить файлы"
                disabled={uploadProgress !== null}
              >
                {uploadProgress !== null ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {Math.round(uploadProgress)}%
                  </div>
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Фильтр по тегам */}
          {allTags.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <Tag className="h-3 w-3" />
                  Фильтр по тегам ({allTags.length}):
                </div>
                {allTags.length > 10 && (
                  <Input
                    placeholder="Поиск тегов..."
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    className="h-7 w-40 text-xs"
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const filteredTags = tagSearchQuery
                    ? allTags.filter(tag => tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                    : allTags
                  const visibleTags = showAllTags ? filteredTags : filteredTags.slice(0, 10)
                  
                  return (
                    <>
                      {visibleTags.map(tag => (
                        <Badge
                          key={tag}
                          variant={selectedTags.has(tag) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleTagFilter(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                      {!tagSearchQuery && filteredTags.length > 10 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setShowAllTags(!showAllTags)}
                        >
                          {showAllTags ? `Скрыть` : `+${filteredTags.length - 10} ещё`}
                        </Button>
                      )}
                    </>
                  )
                })()}
                {selectedTags.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTags(new Set())}
                    className="h-6 text-xs"
                  >
                    Очистить
                  </Button>
                )}
              </div>
            </div>
          )}
          
          {selectedFiles.size > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                Выбрано: {selectedFiles.size}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFiles(new Set())}
              >
                Снять выделение
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Files Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map(file => {
            const isSelected = selectedFiles.has(file.id)
            const isImage = file.mimeType?.startsWith('image/')
            
            return (
              <Card
                key={file.id}
                className={cn(
                  'relative cursor-pointer transition-all hover:shadow-lg',
                  isSelected && 'ring-2 ring-primary'
                )}
                onClick={() => handleFileClick(file)}
              >
                <CardContent className="p-4">
                  {/* Thumbnail */}
                  <div className="aspect-square rounded-lg bg-muted mb-3 flex items-center justify-center overflow-hidden">
                    {isImage && file.thumbnail ? (
                      <img 
                        src={file.thumbnail} 
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground">
                        {getFileIcon(file)}
                      </div>
                    )}
                  </div>
                  
                  {/* File info */}
                  <div className="space-y-1">
                    <div className="text-sm font-medium truncate" title={file.name}>
                      {file.name}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{formatDate(file.createdAt)}</span>
                    </div>
                    
                    {/* Tags */}
                    {file.type === 'file' && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {file.tags?.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowTagEditor(file.id)
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Кнопки добавления в макет */}
                  {onAddToCanvas && file.type === 'file' && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {isImage ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1"
                            onClick={async (e) => {
                              e.stopPropagation()
                              onAddToCanvas(file, 'image')
                            }}
                            title="Вставить как изображение"
                          >
                            <ImageIconLucide className="h-3 w-3 mr-1" />
                            Изображение
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1"
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (file.url) {
                                // TODO: Раскомментировать когда qrcode установится
                                // const qrDataUrl = await QRCode.toDataURL(file.url, { width: 300, margin: 2 })
                                // onAddToCanvas({ ...file, url: qrDataUrl }, 'qr')
                                alert('QR-код будет доступен после установки библиотеки qrcode')
                              }
                            }}
                            title="Вставить QR-код"
                          >
                            <QrCode className="h-3 w-3 mr-1" />
                            QR
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1"
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (file.url) {
                                // TODO: Раскомментировать когда qrcode установится
                                // const qrDataUrl = await QRCode.toDataURL(file.url, { width: 300, margin: 2 })
                                // onAddToCanvas({ ...file, url: qrDataUrl }, 'qr')
                                alert('QR-код будет доступен после установки библиотеки qrcode')
                              }
                            }}
                            title="Вставить QR-код"
                          >
                            <QrCode className="h-3 w-3 mr-1" />
                            QR
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAddToCanvas(file, 'link')
                            }}
                            title="Вставить ссылку"
                          >
                            <LinkIcon className="h-3 w-3 mr-1" />
                            Ссылка
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="mt-3 flex gap-1">
                    {file.type === 'file' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(file)
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(file.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  
                  {/* Tag Editor */}
                  {showTagEditor === file.id && (
                    <div 
                      className="mt-2 p-2 bg-muted rounded-md space-y-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          <Input
                            placeholder="Новый тег или выберите ниже..."
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                addTag(file.id, newTag)
                              }
                            }}
                            className="h-7 text-xs"
                          />
                          <Button
                            size="sm"
                            className="h-7"
                            onClick={() => {
                              addTag(file.id, newTag)
                            }}
                          >
                            +
                          </Button>
                        </div>
                        
                        {/* Autocomplete suggestions */}
                        {newTag.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">Похожие:</span>
                            {allTags
                              .filter(t => 
                                t.toLowerCase().includes(newTag.toLowerCase()) && 
                                !file.tags?.includes(t)
                              )
                              .slice(0, 5)
                              .map(tag => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                  onClick={() => {
                                    addTag(file.id, tag)
                                  }}
                                >
                                  {tag}
                                </Badge>
                              ))}
                          </div>
                        )}
                        
                        {/* Popular tags */}
                        {newTag.length === 0 && allTags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">Частые:</span>
                            {allTags
                              .filter(t => !file.tags?.includes(t))
                              .slice(0, 5)
                              .map(tag => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                  onClick={() => {
                                    addTag(file.id, tag)
                                  }}
                                >
                                  {tag}
                                </Badge>
                              ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {file.tags?.map(tag => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs cursor-pointer"
                            onClick={() => removeTag(file.id, tag)}
                          >
                            {tag} <X className="h-2 w-2 ml-1" />
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-6 text-xs"
                        onClick={() => setShowTagEditor(null)}
                      >
                        Закрыть
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : viewMode === 'list' ? (
        /* Files List */
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredFiles.map(file => {
                const isSelected = selectedFiles.has(file.id)
                
                return (
                  <div
                    key={file.id}
                    className={cn(
                      'flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                      isSelected && 'bg-primary/5'
                    )}
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="text-muted-foreground">
                      {getFileIcon(file)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{file.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(file.createdAt)}
                      </div>
                      {file.type === 'file' && file.tags && file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {file.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground hidden sm:block">
                      {formatFileSize(file.size)}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(file)
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(file.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Tree View */
        <Card>
          <CardContent className="p-4">
            <div className="text-sm space-y-1">
              {filteredFiles
                .filter(f => !f.parentId)
                .map(file => (
                  <div key={file.id} className="py-1">
                    <div 
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted',
                        selectedFiles.has(file.id) && 'bg-primary/10'
                      )}
                      onClick={() => handleFileClick(file)}
                    >
                      {file.type === 'folder' ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <div className="w-4" />
                      )}
                      {getFileIcon(file)}
                      <span className="flex-1">{file.name}</span>
                      {file.type === 'file' && (
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                      )}
                    </div>
                    {file.type === 'folder' && file.children && file.children.length > 0 && (
                      <div className="ml-6 mt-1">
                        {file.children.map(child => (
                          <div 
                            key={child.id}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted',
                              selectedFiles.has(child.id) && 'bg-primary/10'
                            )}
                            onClick={() => handleFileClick(child)}
                          >
                            {getFileIcon(child)}
                            <span className="flex-1">{child.name}</span>
                            {child.type === 'file' && (
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(child.size)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredFiles.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <HardDrive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <div className="text-lg font-medium mb-2">Файлов не найдено</div>
            <div className="text-sm text-muted-foreground">
              {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Сгенерированные изображения появятся здесь'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Preview Modal */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-w-4xl w-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10"
              onClick={() => setPreviewFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={previewFile.url}
              alt={previewFile.name}
              className="w-full h-auto rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-4 bg-card rounded-lg p-4">
              <div className="font-medium">{previewFile.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {formatFileSize(previewFile.size)} • {formatDate(previewFile.createdAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Диалог создания папки */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Создать папку</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewFolderDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Название папки"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              className="mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowNewFolderDialog(false)}
              >
                Отмена
              </Button>
              <Button onClick={createFolder}>
                Создать
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
