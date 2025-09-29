import Link from 'next/link'

export default function ChildExercises() {
  const exercises = [
    { id: 1, title: "Pronunciation Practice", type: "pronunciation", difficulty: "easy" },
    { id: 2, title: "Rhythm Games", type: "rhythm", difficulty: "medium" },
    { id: 3, title: "Memory Challenge", type: "memory", difficulty: "hard" },
  ]

  return (
    <div className="min-h-screen bg-blue-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/" className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">NeuroGen</h1>
              </Link>
            </div>
            <div className="flex items-center">
              <Link href="/therapist" className="bg-blue-500 text-white px-4 py-2 rounded">
                Therapist View
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold mb-4">My Exercises</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <h3 className="text-lg font-medium text-gray-900">{exercise.title}</h3>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {exercise.type}
                    </span>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {exercise.difficulty}
                    </span>
                  </div>
                  <div className="mt-3">
                    <button className="bg-green-500 text-white px-4 py-2 rounded">
                      Start Exercise
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
