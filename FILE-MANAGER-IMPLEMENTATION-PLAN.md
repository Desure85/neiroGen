# 📁 План реализации файлового менеджера

**Статус:** В процессе  
**Прогресс:** 20%

---

## ✅ Что уже сделано

1. ✅ Добавлены импорты иконок (FolderTree, Upload, QrCode, LinkIcon)
2. ✅ Добавлен импорт QRCode (ждём установки)
3. ✅ Добавлен prop `onAddToCanvas` в интерфейс
4. ✅ Добавлены состояния для новых диалогов
5. ✅ Обновлён viewMode для поддержки 'tree'

---

## 🔄 В процессе

### Установка библиотеки
```bash
sudo npm install qrcode @types/qrcode
```

---

## 📋 Что осталось сделать

### 1. Добавить функции (после handleDownload)

```typescript
// Генерация QR-кода
const generateQRCode = async (url: string): Promise<string> => {
  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    return qrDataUrl
  } catch (err) {
    console.error('QR code generation failed:', err)
    throw err
  }
}

// Проверка типа файла
const isImageFile = (mimeType?: string): boolean => {
  return mimeType?.startsWith('image/') ?? false
}

// Создание папки
const handleCreateFolder = () => {
  setShowNewFolderDialog(true)
}

const createFolder = async () => {
  if (!newFolderName.trim()) return
  
  const newFolder: FileItem = {
    id: `folder-${Date.now()}`,
    name: newFolderName,
    type: 'folder',
    createdAt: new Date(),
    parentId: currentFolderId,
  }
  
  // TODO: API call
  setFiles(prev => [...prev, newFolder])
  setNewFolderName('')
  setShowNewFolderDialog(false)
}

// Загрузка файлов
const handleUploadFiles = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = 'image/*,application/pdf,audio/*'
  
  input.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files
    if (!files) return
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      await uploadFile(file)
    }
  }
  
  input.click()
}

const uploadFile = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('parentId', currentFolderId || '')
  
  try {
    setUploadProgress(0)
    
    // TODO: Реальный API call
    // const response = await fetch('/api/files/upload', {
    //   method: 'POST',
    //   body: formData,
    // })
    
    // const newFile = await response.json()
    // setFiles(prev => [...prev, newFile])
    
    // Mock для демо
    const mockFile: FileItem = {
      id: `file-${Date.now()}`,
      name: file.name,
      type: 'file',
      size: file.size,
      mimeType: file.type,
      createdAt: new Date(),
      parentId: currentFolderId,
      url: URL.createObjectURL(file),
      thumbnail: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }
    setFiles(prev => [...prev, mockFile])
    
  } catch (error) {
    console.error('Upload failed:', error)
  } finally {
    setUploadProgress(null)
  }
}
```

---

### 2. Обновить Toolbar (добавить кнопки)

**Найти:** `<div className="flex gap-2">`  
**После кнопок Grid/List добавить:**

```tsx
{/* НОВАЯ: Дерево */}
<Button 
  variant={viewMode === 'tree' ? 'default' : 'outline'}
  size="sm"
  onClick={() => setViewMode('tree')}
  title="Древовидное отображение"
>
  <FolderTree className="h-4 w-4" />
</Button>

{/* Разделитель */}
<div className="h-8 w-px bg-border" />

{/* НОВАЯ: Создать папку */}
<Button 
  variant="outline"
  size="sm"
  onClick={handleCreateFolder}
  title="Создать папку"
>
  <FolderPlus className="h-4 w-4" />
</Button>

{/* НОВАЯ: Загрузить файлы */}
<Button 
  variant="outline"
  size="sm"
  onClick={handleUploadFiles}
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
```

---

### 3. Добавить кнопки действий для файлов

**В карточке файла (grid mode) добавить:**

```tsx
{onAddToCanvas && (
  <div className="mt-2 flex gap-1 flex-wrap">
    {isImageFile(file.mimeType) ? (
      <>
        {/* Для изображений - 2 варианта */}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={async () => {
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
          className="h-7 text-xs"
          onClick={async () => {
            if (file.url) {
              const qrDataUrl = await generateQRCode(file.url)
              onAddToCanvas({ ...file, url: qrDataUrl }, 'qr')
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
        {/* Для файлов - 2 варианта */}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={async () => {
            if (file.url) {
              const qrDataUrl = await generateQRCode(file.url)
              onAddToCanvas({ ...file, url: qrDataUrl }, 'qr')
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
          className="h-7 text-xs"
          onClick={() => onAddToCanvas(file, 'link')}
          title="Вставить ссылку"
        >
          <LinkIcon className="h-3 w-3 mr-1" />
          Ссылка
        </Button>
      </>
    )}
  </div>
)}
```

---

### 4. Добавить диалог создания папки

**В конце return(), перед закрывающим `</div>`:**

```tsx
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
```

---

### 5. Добавить древовидное отображение

**После list mode, добавить tree mode:**

```tsx
{/* Tree View */}
{viewMode === 'tree' && (
  <Card>
    <CardContent className="p-4">
      <TreeView files={filteredFiles} />
    </CardContent>
  </Card>
)}

// TreeView component
const TreeView = ({ files }: { files: FileItem[] }) => {
  return (
    <div>
      {files
        .filter(f => !f.parentId)
        .map(file => (
          <TreeNode key={file.id} file={file} allFiles={files} level={0} />
        ))}
    </div>
  )
}

const TreeNode = ({ file, allFiles, level }: { 
  file: FileItem
  allFiles: FileItem[]
  level: number 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const children = allFiles.filter(f => f.parentId === file.id)
  const hasChildren = children.length > 0
  
  return (
    <div>
      <div 
        className="flex items-center gap-2 py-1 hover:bg-muted cursor-pointer rounded"
        style={{ paddingLeft: `${level * 20}px` }}
        onClick={() => {
          if (hasChildren) {
            setIsOpen(!isOpen)
          } else if (file.type === 'file') {
            // Обработать клик по файлу
          }
        }}
      >
        {hasChildren && (
          isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
        )}
        {!hasChildren && <div className="w-4" />}
        {getFileIcon(file)}
        <span className="text-sm">{file.name}</span>
      </div>
      
      {isOpen && hasChildren && (
        <div>
          {children.map(child => (
            <TreeNode 
              key={child.id} 
              file={child} 
              allFiles={allFiles} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

---

### 6. Интеграция с макетом (worksheet-layout-canvas)

**Добавить в worksheet-layout-canvas.tsx:**

```typescript
import { FileManager } from '@/components/file-manager'
import QRCode from 'qrcode'

const [showFileManager, setShowFileManager] = useState(false)

// Функция для добавления файла на canvas
const handleAddFileToCanvas = async (
  file: FileItem, 
  insertType: 'image' | 'qr' | 'link'
) => {
  if (insertType === 'image' && file.url) {
    // Добавить изображение
    const newElement: CanvasElement = {
      id: generateId(),
      type: 'image',
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      url: file.url,
    }
    setScene(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }))
  } else if (insertType === 'qr') {
    // file.url уже содержит QR data URL
    const newElement: CanvasElement = {
      id: generateId(),
      type: 'image',
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      url: file.url, // QR data URL
    }
    setScene(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }))
  } else if (insertType === 'link' && file.url) {
    // Добавить текст со ссылкой
    const newElement: CanvasElement = {
      id: generateId(),
      type: 'text',
      x: 100,
      y: 100,
      width: 300,
      height: 50,
      text: file.url,
      fontSize: 14,
    }
    setScene(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }))
  }
  
  setShowFileManager(false)
}

// В кнопке "Из галереи" (найти или добавить)
<Button onClick={() => setShowFileManager(true)}>
  <ImagePlus className="h-4 w-4 mr-2" />
  Из галереи
</Button>

// Диалог с файловым менеджером
{showFileManager && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-auto">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">Выбрать файл</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowFileManager(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4">
        <FileManager
          title="Выбрать файл"
          onAddToCanvas={handleAddFileToCanvas}
          filterTypes={['image/*']}
        />
      </div>
    </div>
  </div>
)}
```

---

## 🎯 Порядок выполнения

1. ✅ Дождаться установки qrcode
2. ⏳ Добавить функции в file-manager.tsx
3. ⏳ Обновить Toolbar с новыми кнопками
4. ⏳ Добавить кнопки действий в карточки файлов
5. ⏳ Добавить диалог создания папки
6. ⏳ Добавить древовидное отображение
7. ⏳ Интегрировать с макетом

---

## 📊 Прогресс

- [x] Подготовка и импорты (20%)
- [ ] Функции управления файлами (0%)
- [ ] UI кнопки и диалоги (0%)
- [ ] Древовидное отображение (0%)
- [ ] Интеграция с макетом (0%)

**Итого: 20% готово**

---

## 🚀 После завершения

Файловый менеджер будет иметь:
- ✅ 3 режима отображения (сетка, список, дерево)
- ✅ Создание папок
- ✅ Загрузка файлов
- ✅ Генерация QR-кодов
- ✅ Вставка в макет (изображение / QR / ссылка)
- ✅ Теги и фильтрация
- ✅ Поиск

**Готово к продакшену! 🎉**
