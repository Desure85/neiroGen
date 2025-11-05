# 📁 Улучшения файлового менеджера

**Файл:** `/frontend/src/components/file-manager.tsx`  
**Дата:** 5 ноября 2025  
**Статус:** План улучшений

---

## 🎯 Что нужно добавить

### 1. Кнопки управления (в Toolbar)

**Текущее состояние:**
```tsx
<div className="flex gap-2">
  <Button variant={viewMode === 'grid' ? 'default' : 'outline'}>
    <Grid3x3 />  {/* Сетка */}
  </Button>
  <Button variant={viewMode === 'list' ? 'default' : 'outline'}>
    <List />     {/* Список */}
  </Button>
</div>
```

**Нужно добавить:**
```tsx
<div className="flex gap-2">
  {/* Существующие кнопки */}
  <Button variant={viewMode === 'grid' ? 'default' : 'outline'}>
    <Grid3x3 />
  </Button>
  <Button variant={viewMode === 'list' ? 'default' : 'outline'}>
    <List />
  </Button>
  
  {/* НОВАЯ: Дерево */}
  <Button 
    variant={viewMode === 'tree' ? 'default' : 'outline'}
    onClick={() => setViewMode('tree')}
    title="Древовидное отображение"
  >
    <FolderTree />
  </Button>
  
  {/* Разделитель */}
  <div className="h-8 w-px bg-border" />
  
  {/* НОВАЯ: Создать папку */}
  <Button 
    variant="outline"
    onClick={handleCreateFolder}
    title="Создать папку"
  >
    <FolderPlus />
  </Button>
  
  {/* НОВАЯ: Загрузить файлы */}
  <Button 
    variant="outline"
    onClick={handleUploadFiles}
    title="Загрузить файлы"
  >
    <Upload />
  </Button>
</div>
```

---

### 2. Генерация QR-кодов

**Установить библиотеку:**
```bash
npm install qrcode
npm install @types/qrcode --save-dev
```

**Добавить функции:**
```tsx
import QRCode from 'qrcode'

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

// Определение типа файла
const isImageFile = (mimeType?: string): boolean => {
  return mimeType?.startsWith('image/') ?? false
}
```

---

### 3. Интеграция с макетом

**Добавить в props:**
```tsx
interface FileManagerProps {
  title?: string
  onFileSelect?: (file: FileItem) => void
  onAddToCanvas?: (file: FileItem, insertType: 'image' | 'qr' | 'link') => void  // НОВОЕ
  allowMultiple?: boolean
  filterTypes?: string[]
}
```

**Добавить кнопки действий для каждого файла:**
```tsx
// В карточке файла
{onAddToCanvas && (
  <div className="mt-2 flex gap-1">
    {isImageFile(file.mimeType) ? (
      <>
        {/* Для изображений - 2 варианта */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAddToCanvas(file, 'image')}
          title="Вставить как изображение"
        >
          <ImageIcon className="h-3 w-3 mr-1" />
          Изображение
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAddToCanvas(file, 'qr')}
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
          onClick={() => onAddToCanvas(file, 'qr')}
          title="Вставить QR-код"
        >
          <QrCode className="h-3 w-3 mr-1" />
          QR
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAddToCanvas(file, 'link')}
          title="Вставить ссылку"
        >
          <Link className="h-3 w-3 mr-1" />
          Ссылка
        </Button>
      </>
    )}
  </div>
)}
```

---

### 4. Древовидное отображение

**Добавить viewMode: 'tree':**
```tsx
const [viewMode, setViewMode] = useState<'grid' | 'list' | 'tree'>('grid')

// Компонент для дерева
const TreeView = ({ files }: { files: FileItem[] }) => {
  return (
    <div className="border rounded-lg p-4">
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
        className="flex items-center gap-2 py-1 hover:bg-muted cursor-pointer"
        style={{ paddingLeft: `${level * 20}px` }}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
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

### 5. Создание папок

**Добавить состояние и функцию:**
```tsx
const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
const [newFolderName, setNewFolderName] = useState('')

const handleCreateFolder = async () => {
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
```

**Добавить диалог:**
```tsx
{showNewFolderDialog && (
  <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Создать папку</DialogTitle>
      </DialogHeader>
      <Input
        placeholder="Название папки"
        value={newFolderName}
        onChange={(e) => setNewFolderName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && createFolder()}
      />
      <DialogFooter>
        <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
          Отмена
        </Button>
        <Button onClick={createFolder}>
          Создать
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
```

---

### 6. Загрузка файлов

**Добавить функцию:**
```tsx
const [uploadProgress, setUploadProgress] = useState<number | null>(null)

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
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
      // Добавить progress tracking
    })
    
    const newFile = await response.json()
    setFiles(prev => [...prev, newFile])
    
  } catch (error) {
    console.error('Upload failed:', error)
    // TODO: Показать ошибку
  } finally {
    setUploadProgress(null)
  }
}
```

---

### 7. Интеграция с макетом (worksheet-layout-canvas)

**В worksheet-layout-canvas.tsx добавить:**
```tsx
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
    addElement('image')
    // Установить URL изображения
    // updateElement(id, { url: file.url })
  } else if (insertType === 'qr' && file.url) {
    // Генерировать QR-код
    const qrDataUrl = await QRCode.toDataURL(file.url)
    // Добавить как изображение с QR
    addElement('image')
    // updateElement(id, { url: qrDataUrl })
  } else if (insertType === 'link' && file.url) {
    // Добавить текст со ссылкой
    addElement('text')
    // updateElement(id, { text: file.url })
  }
  
  setShowFileManager(false)
}

// В кнопке "Из галереи"
<Button onClick={() => setShowFileManager(true)}>
  <ImagePlus /> Из галереи
</Button>

// Диалог с файловым менеджером
{showFileManager && (
  <Dialog open={showFileManager} onOpenChange={setShowFileManager}>
    <DialogContent className="max-w-4xl">
      <FileManager
        title="Выбрать файл"
        onAddToCanvas={handleAddFileToCanvas}
        filterTypes={['image/*']}
      />
    </DialogContent>
  </Dialog>
)}
```

---

## 📦 Необходимые импорты

```tsx
import { 
  FolderTree,    // Для дерева
  Upload,        // Для загрузки
  QrCode,        // Для QR
  Link,          // Для ссылки
  ImageIcon      // Для изображения
} from 'lucide-react'

import QRCode from 'qrcode'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
```

---

## 🎯 Итоговый чеклист

### Файловый менеджер
- [ ] Добавить viewMode: 'tree'
- [ ] Реализовать компонент TreeView
- [ ] Добавить кнопку "Дерево" в Toolbar
- [ ] Добавить кнопку "Создать папку" в Toolbar
- [ ] Добавить кнопку "Загрузить файлы" в Toolbar
- [ ] Реализовать функцию создания папки
- [ ] Реализовать функцию загрузки файлов
- [ ] Установить библиотеку qrcode
- [ ] Добавить функцию генерации QR-кодов
- [ ] Добавить prop `onAddToCanvas`
- [ ] Добавить кнопки действий для файлов (изображение/QR для картинок, QR/ссылка для файлов)

### Интеграция с макетом
- [ ] Добавить состояние `showFileManager` в worksheet-layout-canvas
- [ ] Реализовать функцию `handleAddFileToCanvas`
- [ ] Добавить кнопку "Из галереи" с открытием FileManager
- [ ] Добавить Dialog с FileManager
- [ ] Обработать вставку изображения
- [ ] Обработать вставку QR-кода
- [ ] Обработать вставку ссылки

---

## 🚀 Порядок реализации

1. **Установить зависимости:**
   ```bash
   cd frontend
   npm install qrcode
   npm install @types/qrcode --save-dev
   ```

2. **Обновить файловый менеджер:**
   - Добавить кнопки в Toolbar
   - Реализовать древовидное отображение
   - Добавить создание папок
   - Добавить загрузку файлов
   - Добавить генерацию QR-кодов
   - Добавить кнопки действий

3. **Интегрировать с макетом:**
   - Добавить FileManager в диалог
   - Реализовать обработчик добавления файлов

---

**Это комплексная задача на ~2-3 часа работы!**
