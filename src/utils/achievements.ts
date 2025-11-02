/**
 * Achievement Detection
 *
 * Detects and tracks achievements, milestones, and notable events
 */

import type Database from 'better-sqlite3';
import { differenceInDays } from 'date-fns';
import { analyzeSkillProficiency } from './skill-proficiency.js';

export interface Achievement {
  id: string;
  type: 'streak' | 'skill' | 'cost' | 'productivity' | 'milestone';
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  metadata?: Record<string, any>;
}

export interface AchievementCheck {
  achieved: boolean;
  achievement?: Achievement;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

/**
 * Check for streak achievements
 */
export function checkStreakAchievements(db: Database.Database): AchievementCheck[] {
  const results: AchievementCheck[] = [];

  // Get current streak
  const streakQuery = db
    .prepare(
      `
    WITH daily_activity AS (
      SELECT DISTINCT DATE(start_time) as activity_date
      FROM sessions
      ORDER BY activity_date DESC
    ),
    streak_calc AS (
      SELECT
        activity_date,
        julianday('now') - julianday(activity_date) as days_ago,
        ROW_NUMBER() OVER (ORDER BY activity_date DESC) -
        (julianday('now') - julianday(activity_date)) as streak_group
      FROM daily_activity
    )
    SELECT COUNT(*) as streak_days
    FROM streak_calc
    WHERE streak_group = (
      SELECT streak_group
      FROM streak_calc
      ORDER BY activity_date DESC
      LIMIT 1
    )
  `
    )
    .get() as any;

  const currentStreak = streakQuery?.streak_days || 0;

  // Streak milestones
  const streakMilestones = [
    { days: 3, title: '3-Day Streak', icon: '🔥' },
    { days: 7, title: 'Week Warrior', icon: '⚡' },
    { days: 14, title: 'Two Week Champion', icon: '💪' },
    { days: 30, title: 'Month Master', icon: '🏆' },
    { days: 60, title: '60-Day Legend', icon: '👑' },
    { days: 90, title: '90-Day Elite', icon: '💎' },
    { days: 180, title: 'Half-Year Hero', icon: '🌟' },
    { days: 365, title: 'Year of Excellence', icon: '🎖️' },
  ];

  for (const milestone of streakMilestones) {
    if (currentStreak >= milestone.days) {
      results.push({
        achieved: true,
        achievement: {
          id: `streak_${milestone.days}`,
          type: 'streak',
          title: milestone.title,
          description: `Maintained a ${milestone.days}-day coding streak!`,
          icon: milestone.icon,
          unlockedAt: new Date(),
          metadata: { streakDays: currentStreak },
        },
      });
    } else if (currentStreak >= milestone.days - 2) {
      // Close to unlocking
      results.push({
        achieved: false,
        progress: {
          current: currentStreak,
          target: milestone.days,
          percentage: (currentStreak / milestone.days) * 100,
        },
      });
    }
  }

  return results;
}

/**
 * Check for skill level achievements
 */
export function checkSkillAchievements(db: Database.Database): AchievementCheck[] {
  const results: AchievementCheck[] = [];
  const proficiencies = analyzeSkillProficiency(db);

  for (const skill of proficiencies) {
    // Expert level achievement
    if (skill.level === 'expert') {
      results.push({
        achieved: true,
        achievement: {
          id: `skill_expert_${skill.skill.toLowerCase().replace(/\s+/g, '_')}`,
          type: 'skill',
          title: `${skill.skill} Expert`,
          description: `Achieved expert level proficiency in ${skill.skill}!`,
          icon: '🎓',
          unlockedAt: new Date(),
          metadata: {
            skill: skill.skill,
            proficiency: skill.proficiency,
            usageCount: skill.usageCount,
          },
        },
      });
    }

    // Advanced level achievement
    if (skill.level === 'advanced') {
      results.push({
        achieved: true,
        achievement: {
          id: `skill_advanced_${skill.skill.toLowerCase().replace(/\s+/g, '_')}`,
          type: 'skill',
          title: `${skill.skill} Advanced`,
          description: `Reached advanced level in ${skill.skill}!`,
          icon: '📚',
          unlockedAt: new Date(),
          metadata: {
            skill: skill.skill,
            proficiency: skill.proficiency,
            usageCount: skill.usageCount,
          },
        },
      });
    }
  }

  return results;
}

/**
 * Check for cost optimization achievements
 */
export function checkCostAchievements(db: Database.Database): AchievementCheck[] {
  const results: AchievementCheck[] = [];

  // Get cache efficiency
  const cacheStats = db
    .prepare(
      `
    SELECT
      SUM(cache_read_tokens) as cache_read,
      SUM(cache_creation_tokens) as cache_creation
    FROM projects
    WHERE cache_creation_tokens > 0
  `
    )
    .get() as any;

  if (cacheStats.cache_read && cacheStats.cache_creation) {
    const hitRatio =
      (cacheStats.cache_read / (cacheStats.cache_read + cacheStats.cache_creation)) * 100;

    if (hitRatio >= 90) {
      results.push({
        achieved: true,
        achievement: {
          id: 'cache_master',
          type: 'cost',
          title: 'Cache Master',
          description: 'Achieved 90%+ cache hit ratio!',
          icon: '💰',
          unlockedAt: new Date(),
          metadata: { hitRatio: Math.round(hitRatio) },
        },
      });
    } else if (hitRatio >= 80) {
      results.push({
        achieved: true,
        achievement: {
          id: 'cache_optimizer',
          type: 'cost',
          title: 'Cache Optimizer',
          description: 'Achieved 80%+ cache hit ratio!',
          icon: '💸',
          unlockedAt: new Date(),
          metadata: { hitRatio: Math.round(hitRatio) },
        },
      });
    }
  }

  return results;
}

/**
 * Check for productivity achievements
 */
export function checkProductivityAchievements(db: Database.Database): AchievementCheck[] {
  const results: AchievementCheck[] = [];

  // Total sessions milestone
  const totalSessions = db
    .prepare('SELECT COUNT(*) as count FROM sessions')
    .get() as any;

  const sessionMilestones = [
    { count: 10, title: 'Getting Started', icon: '🌱' },
    { count: 50, title: 'Regular User', icon: '📊' },
    { count: 100, title: 'Power User', icon: '⚡' },
    { count: 250, title: 'Super User', icon: '🚀' },
    { count: 500, title: 'Elite Coder', icon: '💎' },
    { count: 1000, title: 'Master Developer', icon: '👑' },
  ];

  for (const milestone of sessionMilestones) {
    if (totalSessions.count >= milestone.count) {
      results.push({
        achieved: true,
        achievement: {
          id: `sessions_${milestone.count}`,
          type: 'productivity',
          title: milestone.title,
          description: `Completed ${milestone.count} sessions!`,
          icon: milestone.icon,
          unlockedAt: new Date(),
          metadata: { sessionCount: totalSessions.count },
        },
      });
    }
  }

  // Total prompts milestone
  const totalPrompts = db
    .prepare('SELECT SUM(prompt_count) as count FROM sessions')
    .get() as any;

  const promptMilestones = [
    { count: 100, title: 'Curious Explorer', icon: '🔍' },
    { count: 500, title: 'Active Learner', icon: '📖' },
    { count: 1000, title: 'Dedicated Developer', icon: '💻' },
    { count: 5000, title: 'Prompt Master', icon: '🎯' },
    { count: 10000, title: 'Prompt Legend', icon: '🏅' },
  ];

  for (const milestone of promptMilestones) {
    if (totalPrompts.count >= milestone.count) {
      results.push({
        achieved: true,
        achievement: {
          id: `prompts_${milestone.count}`,
          type: 'productivity',
          title: milestone.title,
          description: `Sent ${milestone.count} prompts!`,
          icon: milestone.icon,
          unlockedAt: new Date(),
          metadata: { promptCount: totalPrompts.count },
        },
      });
    }
  }

  return results;
}

/**
 * Check for special milestone achievements
 */
export function checkMilestoneAchievements(db: Database.Database): AchievementCheck[] {
  const results: AchievementCheck[] = [];

  // First session
  const firstSession = db
    .prepare('SELECT MIN(start_time) as first_session FROM sessions')
    .get() as any;

  if (firstSession.first_session) {
    const daysSinceStart = differenceInDays(new Date(), new Date(firstSession.first_session));

    // Time-based milestones
    const timeMilestones = [
      { days: 1, title: 'Welcome Aboard', icon: '👋' },
      { days: 7, title: 'One Week In', icon: '📅' },
      { days: 30, title: 'One Month Strong', icon: '📆' },
      { days: 90, title: 'Three Month Veteran', icon: '🎖️' },
      { days: 180, title: 'Six Month Pro', icon: '⭐' },
      { days: 365, title: 'One Year Anniversary', icon: '🎂' },
    ];

    for (const milestone of timeMilestones) {
      if (daysSinceStart >= milestone.days) {
        results.push({
          achieved: true,
          achievement: {
            id: `milestone_${milestone.days}_days`,
            type: 'milestone',
            title: milestone.title,
            description: `${milestone.days} days since your first session!`,
            icon: milestone.icon,
            unlockedAt: new Date(),
            metadata: { daysSinceStart },
          },
        });
      }
    }
  }

  // Weekend warrior
  const weekendSessions = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM sessions
    WHERE CAST(strftime('%w', start_time) AS INTEGER) IN (0, 6)
  `
    )
    .get() as any;

  if (weekendSessions.count >= 10) {
    results.push({
      achieved: true,
      achievement: {
        id: 'weekend_warrior',
        type: 'milestone',
        title: 'Weekend Warrior',
        description: 'Completed 10+ weekend coding sessions!',
        icon: '🏖️',
        unlockedAt: new Date(),
        metadata: { weekendCount: weekendSessions.count },
      },
    });
  }

  return results;
}

/**
 * Get all new achievements since last check
 */
export function getNewAchievements(db: Database.Database): Achievement[] {
  // Ensure table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      achievement_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      unlocked_at TEXT NOT NULL,
      metadata TEXT
    )
  `);

  const allChecks = [
    ...checkStreakAchievements(db),
    ...checkSkillAchievements(db),
    ...checkCostAchievements(db),
    ...checkProductivityAchievements(db),
    ...checkMilestoneAchievements(db),
  ];

  // Filter to only achieved
  const achieved = allChecks
    .filter((check) => check.achieved && check.achievement)
    .map((check) => check.achievement!);

  // Get previously unlocked achievements from database
  const unlocked = db
    .prepare('SELECT achievement_id FROM achievements')
    .all() as any[];

  const unlockedIds = new Set(unlocked.map((a) => a.achievement_id));

  // Return only new achievements
  return achieved.filter((a) => !unlockedIds.has(a.id));
}

/**
 * Save achievement to database
 */
export function saveAchievement(db: Database.Database, achievement: Achievement): void {
  // Ensure achievements table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      achievement_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      unlocked_at TEXT NOT NULL,
      metadata TEXT
    )
  `);

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO achievements
    (achievement_id, type, title, description, icon, unlocked_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    achievement.id,
    achievement.type,
    achievement.title,
    achievement.description,
    achievement.icon,
    achievement.unlockedAt.toISOString(),
    achievement.metadata ? JSON.stringify(achievement.metadata) : null
  );
}

/**
 * Get all unlocked achievements
 */
export function getUnlockedAchievements(db: Database.Database): Achievement[] {
  // Ensure table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      achievement_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      unlocked_at TEXT NOT NULL,
      metadata TEXT
    )
  `);

  const achievements = db
    .prepare('SELECT * FROM achievements ORDER BY unlocked_at DESC')
    .all() as any[];

  return achievements.map((a) => ({
    id: a.achievement_id,
    type: a.type,
    title: a.title,
    description: a.description,
    icon: a.icon,
    unlockedAt: new Date(a.unlocked_at),
    metadata: a.metadata ? JSON.parse(a.metadata) : undefined,
  }));
}
