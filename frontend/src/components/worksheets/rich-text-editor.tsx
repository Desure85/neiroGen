"use client"

import React, { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DEFAULT_EDITOR_CLASS = 'min-h-[160px] whitespace-pre-wrap text-sm'

type RichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { HTMLAttributes: { class: 'list-disc pl-6' } },
        orderedList: { HTMLAttributes: { class: 'list-decimal pl-6' } },
      }),
      Underline,
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'focus:outline-none bg-background text-foreground border border-border rounded-md p-3 shadow-sm transition-shadow hover:shadow',
          DEFAULT_EDITOR_CLASS
        ),
        'data-placeholder': placeholder ?? '',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const incoming = value || ''
    if (incoming !== current) {
      editor.commands.setContent(incoming, { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) {
    return (
      <div className={cn('border border-border rounded-md p-3 bg-muted/30 animate-pulse', className)}>
        Загрузка редактора...
      </div>
    )
  }

  const setImage = () => {
    const url = window.prompt('URL изображения')
    if (!url) return
    editor.chain().focus().setImage({ src: url }).run()
  }

  const buttonClass = (isActive: boolean) =>
    cn(
      'h-8 px-2 text-xs font-medium rounded border border-border bg-background hover:bg-muted transition-colors',
      isActive && 'bg-primary text-primary-foreground'
    )

  const EditorContentComponent = EditorContent as unknown as React.ComponentType<{ editor: any }>

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={buttonClass(editor.isActive('bold'))}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            Жирный
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={buttonClass(editor.isActive('italic'))}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            Курсив
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={buttonClass(editor.isActive('underline'))}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            Подчёркнутый
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={buttonClass(editor.isActive('heading', { level: 2 }))}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            Заголовок
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={buttonClass(editor.isActive('bulletList'))}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            Маркированный
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={buttonClass(editor.isActive('orderedList'))}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            Нумерованный
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={buttonClass(editor.isActive({ textAlign: 'left' }))}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            Слева
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={buttonClass(editor.isActive({ textAlign: 'center' }))}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            По центру
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={buttonClass(editor.isActive({ textAlign: 'right' }))}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            Справа
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={buttonClass(editor.isActive({ textAlign: 'justify' }))}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          >
            По ширине
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium rounded border border-border bg-background hover:bg-muted"
            onClick={setImage}
          >
            Изображение
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium rounded border border-border bg-background hover:bg-muted"
            onClick={() => editor.chain().focus().undo().run()}
          >
            Undo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs font-medium rounded border border-border bg-background hover:bg-muted"
            onClick={() => editor.chain().focus().redo().run()}
          >
            Redo
          </Button>
        </div>
      </div>
      <div className="relative">
        <EditorContentComponent editor={editor} />
        {placeholder && !editor.getText().length ? (
          <span className="pointer-events-none absolute left-3 top-3 text-sm text-muted-foreground/80">
            {placeholder}
          </span>
        ) : null}
      </div>
    </div>
  )
}
