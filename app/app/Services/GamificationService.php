<?php

namespace App\Services;

use App\Models\Child;
use Illuminate\Support\Facades\Log;

class GamificationService
{
    /**
     * Check and unlock achievements for a child
     * Returns array of newly unlocked achievements
     *
     * @return array<int, array{name: string, description: string, icon: string, xp_reward: int}>
     */
    public function checkAchievements(Child $child): array
    {
        $newAchievements = [];
        $achievements = config('gamification.achievements', []);
        
        foreach ($achievements as $achievement) {
            $achievementId = $achievement['id'];
            
            // Skip if already unlocked
            if ($child->hasAchievement($achievementId)) {
                continue;
            }
            
            // Check if condition is met
            if ($this->checkCondition($child, $achievement['condition'], $achievement['requirement'])) {
                // Unlock achievement
                $child->unlockAchievement($achievementId);
                
                // Award XP
                $xpReward = $achievement['xp_reward'] ?? 0;
                if ($xpReward > 0) {
                    $child->addXp($xpReward);
                }
                
                $newAchievements[] = [
                    'id' => $achievementId,
                    'name' => $achievement['name'],
                    'description' => $achievement['description'],
                    'icon' => $achievement['icon'],
                    'xp_reward' => $xpReward,
                ];
                
                Log::info("Achievement unlocked", [
                    'child_id' => $child->id,
                    'achievement' => $achievementId,
                ]);
            }
        }
        
        return $newAchievements;
    }
    
    /**
     * Check if a condition is met
     */
    protected function checkCondition(Child $child, string $condition, int $requirement): bool
    {
        return match ($condition) {
            'exercises_completed' => $child->total_exercises_completed >= $requirement,
            'streak_days' => $child->streak_days >= $requirement,
            'level' => $child->level >= $requirement,
            'time_spent' => $child->total_time_spent >= $requirement,
            default => false,
        };
    }
    
    /**
     * Record exercise completion and check achievements
     * This is the main method to call when a child completes an exercise
     */
    public function recordExerciseComplete(Child $child, int $timeSpent = 0): array
    {
        // Record the exercise in child's stats
        $stats = $child->recordExerciseComplete($timeSpent);
        
        // Check for new achievements
        $newAchievements = $this->checkAchievements($child);
        
        return [
            'stats' => $stats,
            'new_achievements' => $newAchievements,
            'gamification' => $child->getGamificationStats(),
        ];
    }
    
    /**
     * Get all available achievements with unlock status
     */
    public function getAllAchievements(Child $child): array
    {
        $achievements = config('gamification.achievements', []);
        $result = [];
        
        foreach ($achievements as $achievement) {
            $unlocked = $child->hasAchievement($achievement['id']);
            
            // Calculate progress if not unlocked
            $progress = 0;
            if (!$unlocked) {
                $progress = $this->calculateProgress($child, $achievement['condition'], $achievement['requirement']);
            }
            
            $result[] = [
                'id' => $achievement['id'],
                'name' => $achievement['name'],
                'description' => $achievement['description'],
                'icon' => $achievement['icon'],
                'xp_reward' => $achievement['xp_reward'],
                'unlocked' => $unlocked,
                'progress' => min(100, $progress),
                'requirement' => $achievement['requirement'],
                'condition' => $achievement['condition'],
            ];
        }
        
        return $result;
    }
    
    /**
     * Calculate progress percentage for an achievement
     */
    protected function calculateProgress(Child $child, string $condition, int $requirement): int
    {
        $current = match ($condition) {
            'exercises_completed' => $child->total_exercises_completed,
            'streak_days' => $child->streak_days,
            'level' => $child->level,
            'time_spent' => $child->total_time_spent,
            default => 0,
        };
        
        if ($requirement <= 0) {
            return 100;
        }
        
        return (int) (($current / $requirement) * 100);
    }
    
    /**
     * Get available avatar themes
     */
    public function getAvatarThemes(): array
    {
        return config('gamification.avatar_themes', []);
    }
    
    /**
     * Update child's avatar theme
     */
    public function setAvatarTheme(Child $child, string $theme): bool
    {
        $availableThemes = array_keys($this->getAvatarThemes());
        
        if (!in_array($theme, $availableThemes)) {
            return false;
        }
        
        $child->avatar_theme = $theme;
        $child->save();
        
        return true;
    }
    
    /**
     * Get level info
     */
    public function getLevelInfo(int $level): array
    {
        $xpRequired = Child::getXpForLevel($level);
        
        return [
            'level' => $level,
            'xp_required' => $xpRequired,
        ];
    }
}
