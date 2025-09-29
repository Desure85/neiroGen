import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-4xl mx-auto px-4">
        <h1 className="text-5xl font-bold mb-8 text-blue-700 dark:text-blue-300 child-text">
          🧠 NeuroGen
        </h1>
        <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
          Современная платформа для нейропсихологических и логопедических упражнений
        </p>
        <div className="space-y-4 mb-8">
          <p className="text-lg text-gray-500 dark:text-gray-400">
            ✨ Адаптивные упражнения для детей
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            📊 Отслеживание прогресса в реальном времени
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            🎯 Персонализированные рекомендации
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/therapist">Кабинет логопеда</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/child">Детские упражнения</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
