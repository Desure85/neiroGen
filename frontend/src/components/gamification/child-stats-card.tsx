"use client"

import { useEffect, useState } from "react"
import { GamificationStats } from "@/lib/api"
import { fetchChildGamification } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface ChildStatsCardProps {
  childId: number | string
}

export function ChildStatsCard({ childId }: ChildStatsCardProps) {
  const [stats, setStats] = useState<GamificationStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await fetchChildGamification(childId)
        setStats(data)
      } catch (error) {
        console.error("Failed to load stats:", error)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [childId])

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-white/20 rounded w-24 mb-2"></div>
            <div className="h-8 bg-white/20 rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Level Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
              {stats.level}
            </div>
            <div>
              <div className="text-xs opacity-80">Уровень</div>
              <div className="font-bold text-lg">{stats.xp} XP</div>
            </div>
          </div>
          
          {/* Streak */}
          {stats.streak_days > 0 && (
            <div className="flex items-center gap-1 bg-orange-500/30 px-3 py-1 rounded-full">
              <span className="text-xl">🔥</span>
              <span className="font-bold">{stats.streak_days}</span>
            </div>
          )}
        </div>

        {/* XP Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs opacity-80">
            <span>До следующего уровня</span>
            <span>{stats.xp_progress}%</span>
          </div>
          <Progress value={stats.xp_progress} className="h-2 bg-white/20" />
        </div>

        {/* Stats Row */}
        <div className="flex justify-between text-xs pt-2 border-t border-white/20">
          <div className="text-center">
            <div className="font-bold text-lg">{stats.total_exercises_completed}</div>
            <div className="opacity-80">Заданий</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg">{stats.total_time_spent_formatted}</div>
            <div className="opacity-80">Время</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg">{stats.achievements.length}</div>
            <div className="opacity-80">Наград</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
