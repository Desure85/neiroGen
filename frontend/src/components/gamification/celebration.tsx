"use client"

import { useEffect, useState } from "react"
import { CompleteExerciseResponse } from "@/lib/api"

interface CelebrationProps {
  result: CompleteExerciseResponse | null
  onClose: () => void
}

export function Celebration({ result, onClose }: CelebrationProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (result) {
      setShow(true)
      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        setShow(false)
        setTimeout(onClose, 300)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [result, onClose])

  if (!result) return null

  const { xp_earned, leveled_up, new_achievements } = result

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={() => {
        setShow(false)
        setTimeout(onClose, 300)
      }}
    >
      <div
        className={`bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-8 rounded-3xl text-white text-center transform transition-all duration-500 ${
          show ? "scale-100" : "scale-75"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold mb-2">
          {leveled_up ? "Уровень повышен!" : "Отлично!"}
        </h2>

        {/* XP Earned */}
        <div className="bg-white/20 rounded-2xl p-4 mb-4">
          <div className="text-5xl font-bold">+{xp_earned}</div>
          <div className="text-xl opacity-90">XP</div>
        </div>

        {/* Level Up Message */}
        {leveled_up && (
          <div className="bg-amber-400 text-amber-900 rounded-xl p-3 mb-4 font-bold">
            ⭐ Уровень {result.level}! ⭐
          </div>
        )}

        {/* New Achievements */}
        {new_achievements.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="text-lg font-semibold">Новые достижения!</div>
            {new_achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="bg-white/20 rounded-lg p-2 flex items-center justify-center gap-2"
              >
                <span className="text-2xl">
                  {achievement.icon === "star"
                    ? "⭐"
                    : achievement.icon === "fire"
                    ? "🔥"
                    : achievement.icon === "trophy"
                    ? "🏆"
                    : "🎯"}
                </span>
                <span className="font-medium">{achievement.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={() => {
            setShow(false)
            setTimeout(onClose, 300)
          }}
          className="bg-white text-purple-600 font-bold py-3 px-8 rounded-full text-lg hover:scale-105 transition-transform"
        >
          Продолжить
        </button>

        {/* Confetti effect - decorative */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"][i % 5],
                animation: `float ${1 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
      `}</style>
    </div>
  )
}

// Simple level up notification
export function LevelUpNotification({
  level,
  onClose,
}: {
  level: number
  onClose: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-3">
        <span className="text-3xl">⬆️</span>
        <div>
          <div className="font-bold">Уровень {level}!</div>
          <div className="text-sm opacity-90">Поздравляем!</div>
        </div>
      </div>
    </div>
  )
}
