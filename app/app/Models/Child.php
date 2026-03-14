<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Child extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'age',
        'gender',
        'avatar',
        'avatar_theme',
        'overall_progress',
        'last_session_at',
        'tenant_id',
        'created_by',
        // Gamification fields
        'xp',
        'level',
        'streak_days',
        'last_activity_date',
        'total_exercises_completed',
        'total_time_spent',
        'unlocked_achievements',
        'rewards',
    ];

    protected $casts = [
        'unlocked_achievements' => 'array',
        'rewards' => 'array',
        'last_activity_date' => 'date',
        'last_session_at' => 'datetime',
        'xp' => 'integer',
        'level' => 'integer',
        'streak_days' => 'integer',
        'total_exercises_completed' => 'integer',
        'total_time_spent' => 'integer',
    ];

    // XP required for each level (exponential curve)
    public static function getXpForLevel(int $level): int
    {
        return (int) (100 * pow(1.5, $level - 1));
    }

    // Calculate level from total XP
    public static function calculateLevel(int $totalXp): int
    {
        $level = 1;
        $xpNeeded = 0;
        
        while ($xpNeeded <= $totalXp) {
            $xpNeeded += self::getXpForLevel($level);
            if ($xpNeeded <= $totalXp) {
                $level++;
            }
        }
        
        return $level;
    }

    // Get XP progress to next level (0-100)
    public function getXpProgress(): int
    {
        $currentLevelXp = 0;
        for ($i = 1; $i < $this->level; $i++) {
            $currentLevelXp += self::getXpForLevel($i);
        }
        
        $xpInCurrentLevel = $this->xp - $currentLevelXp;
        $xpNeeded = self::getXpForLevel($this->level);
        
        // Prevent division by zero
        if ($xpNeeded <= 0) {
            return 100;
        }
        
        return min(100, (int) (($xpInCurrentLevel / $xpNeeded) * 100));
    }

    // Add XP and handle level ups
    public function addXp(int $amount): array
    {
        $this->xp += $amount;
        $newLevel = self::calculateLevel($this->xp);
        $leveledUp = $newLevel > $this->level;
        
        if ($leveledUp) {
            $this->level = $newLevel;
        }
        
        $this->save();
        
        return [
            'new_xp' => $this->xp,
            'new_level' => $this->level,
            'leveled_up' => $leveledUp,
            'xp_progress' => $this->getXpProgress(),
        ];
    }

    // Update streak (call when child completes an exercise)
    public function updateStreak(): int
    {
        $today = now()->toDateString();
        
        // First activity or already active today
        if (empty($this->last_activity_date)) {
            $this->streak_days = 1;
        } elseif ($this->last_activity_date === $today) {
            return $this->streak_days;
        } else {
            $yesterday = now()->subDay()->toDateString();
            
            if ($this->last_activity_date === $yesterday) {
                $this->streak_days++;
            } else {
                $this->streak_days = 1;
            }
        }
        
        $this->last_activity_date = $today;
        $this->save();
        
        return $this->streak_days;
    }

    // Record exercise completion
    public function recordExerciseComplete(int $timeSpent = 0): array
    {
        $this->total_exercises_completed++;
        $this->total_time_spent += $timeSpent;
        
        // Update streak
        $newStreak = $this->updateStreak();
        
        // Calculate XP reward
        $baseXp = 10; // Base XP per exercise
        $streakBonus = min($this->streak_days, 10); // Up to 10xp bonus for streak
        $timeBonus = $timeSpent > 0 ? min((int) ($timeSpent / 60), 5) : 0; // Up to 5xp for time spent
        
        $xpEarned = $baseXp + $streakBonus + $timeBonus;
        
        // Add XP and check for level up
        $xpResult = $this->addXp($xpEarned);
        
        return [
            'xp_earned' => $xpEarned,
            'total_xp' => $this->xp,
            'level' => $this->level,
            'streak_days' => $newStreak,
            'total_exercises' => $this->total_exercises_completed,
            'leveled_up' => $xpResult['leveled_up'],
            'xp_progress' => $xpResult['xp_progress'],
        ];
    }

    // Unlock achievement
    public function unlockAchievement(string $achievementId): bool
    {
        $achievements = $this->unlocked_achievements ?? [];
        
        if (!in_array($achievementId, $achievements)) {
            $achievements[] = $achievementId;
            $this->unlocked_achievements = $achievements;
            $this->save();
            return true;
        }
        
        return false;
    }

    // Check if achievement is unlocked
    public function hasAchievement(string $achievementId): bool
    {
        $achievements = $this->unlocked_achievements ?? [];
        return in_array($achievementId, $achievements);
    }

    // Get gamification stats for API
    public function getGamificationStats(): array
    {
        return [
            'xp' => $this->xp,
            'level' => $this->level,
            'xp_progress' => $this->getXpProgress(),
            'xp_to_next_level' => self::getXpForLevel($this->level),
            'streak_days' => $this->streak_days,
            'total_exercises_completed' => $this->total_exercises_completed,
            'total_time_spent' => $this->total_time_spent,
            'total_time_spent_formatted' => $this->formatTimeSpent(),
            'achievements' => $this->unlocked_achievements ?? [],
            'rewards' => $this->rewards ?? [],
            'avatar_theme' => $this->avatar_theme ?? 'default',
        ];
    }

    // Format time spent in human readable format
    public function formatTimeSpent(): string
    {
        $seconds = $this->total_time_spent;
        
        if ($seconds < 60) {
            return "{$seconds} сек";
        }
        
        $minutes = (int) ($seconds / 60);
        
        if ($minutes < 60) {
            return "{$minutes} мин";
        }
        
        $hours = (int) ($minutes / 60);
        $remainingMinutes = $minutes % 60;
        
        return "{$hours} ч {$remainingMinutes} мин";
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class);
    }

    public function worksheets(): HasMany
    {
        return $this->hasMany(Worksheet::class);
    }
}
