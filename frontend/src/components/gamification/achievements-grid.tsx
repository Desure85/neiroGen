"use client"

import { useEffect, useState } from "react"
import { Achievement, fetchChildAchievements } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AchievementsGridProps {
  childId: number | string
}

const ICON_MAP: Record<string, string> = {
  star: "⭐",
  rocket: "🚀",
  trophy: "🏆",
  crown: "👑",
  medal: "🏅",
  fire: "🔥",
  flame: "💫",
  lightning: "⚡",
  stars: "✨",
  gem: "💎",
  clock: "⏰",
  hourglass: "⌛",
}

export function AchievementsGrid({ childId }: AchievementsGridProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAchievements() {
      try {
        const data = await fetchChildAchievements(childId)
        setAchievements(data.achievements)
      } catch (error) {
        console.error("Failed to load achievements:", error)
      } finally {
        setLoading(false)
      }
    }
    loadAchievements()
  }, [childId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Достижения</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-muted h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const unlockedCount = achievements.filter((a) => a.unlocked).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Достижения</CardTitle>
          <span className="text-sm text-muted-foreground">
            {unlockedCount} / {achievements.length}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {achievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const icon = ICON_MAP[achievement.icon] || "🎯"

  if (achievement.unlocked) {
    return (
      <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-3 text-center transition-transform hover:scale-105">
        <div className="text-3xl mb-1">{icon}</div>
        <div className="font-semibold text-sm">{achievement.name}</div>
        <div className="text-xs text-muted-foreground">{achievement.description}</div>
        {achievement.xp_reward > 0 && (
          <div className="mt-1 text-xs text-amber-600 font-medium">
            +{achievement.xp_reward} XP
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg p-3 text-center opacity-60">
      <div className="text-3xl mb-1 grayscale">{icon}</div>
      <div className="font-semibold text-sm text-muted-foreground">{achievement.name}</div>
      <div className="text-xs text-muted-foreground">
        {achievement.progress}% выполнено
      </div>
      <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${achievement.progress}%` }}
        />
      </div>
    </div>
  )
}
