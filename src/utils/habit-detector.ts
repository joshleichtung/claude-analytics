/**
 * Habit Pattern Detection
 *
 * Analyzes usage patterns to identify habits and routines
 */

import type { HabitPattern } from '../types/index.js';
import type Database from 'better-sqlite3';
import { format, differenceInDays, parseISO } from 'date-fns';

/**
 * Time-based pattern (e.g., "Morning coder", "Night owl")
 */
interface TimePattern {
  name: string;
  description: string;
  hourRange: [number, number];
  frequency: number;
  confidence: number;
}

/**
 * Day-based pattern (e.g., "Weekend warrior", "Weekday grinder")
 */
interface DayPattern {
  name: string;
  description: string;
  days: number[]; // 0 = Sunday, 6 = Saturday
  frequency: number;
  confidence: number;
}

/**
 * Project focus pattern
 */
interface FocusPattern {
  name: string;
  description: string;
  projectPatterns: string[];
  frequency: number;
  confidence: number;
}

/**
 * Detect time-of-day patterns
 */
export function detectTimePatterns(db: Database.Database): TimePattern[] {
  const patterns: TimePattern[] = [];

  // Get hourly distribution
  const hourlyStats = db
    .prepare(
      `
    SELECT
      strftime('%H', start_time) as hour,
      COUNT(*) as session_count
    FROM sessions
    WHERE start_time >= datetime('now', '-30 days')
    GROUP BY hour
  `
    )
    .all() as any[];

  const totalSessions = hourlyStats.reduce(
    (sum, h) => sum + h.session_count,
    0
  );

  // Morning pattern (6am - 11am)
  const morningHours = hourlyStats.filter(
    (h) => parseInt(h.hour) >= 6 && parseInt(h.hour) < 12
  );
  const morningSessions = morningHours.reduce(
    (sum, h) => sum + h.session_count,
    0
  );
  if (morningSessions / totalSessions > 0.3) {
    patterns.push({
      name: 'Morning Coder',
      description: 'Most productive in the morning (6am-12pm)',
      hourRange: [6, 12],
      frequency: morningSessions,
      confidence: Math.min(95, (morningSessions / totalSessions) * 100),
    });
  }

  // Afternoon pattern (12pm - 5pm)
  const afternoonHours = hourlyStats.filter(
    (h) => parseInt(h.hour) >= 12 && parseInt(h.hour) < 17
  );
  const afternoonSessions = afternoonHours.reduce(
    (sum, h) => sum + h.session_count,
    0
  );
  if (afternoonSessions / totalSessions > 0.3) {
    patterns.push({
      name: 'Afternoon Achiever',
      description: 'Peak productivity in the afternoon (12pm-5pm)',
      hourRange: [12, 17],
      frequency: afternoonSessions,
      confidence: Math.min(95, (afternoonSessions / totalSessions) * 100),
    });
  }

  // Evening pattern (5pm - 10pm)
  const eveningHours = hourlyStats.filter(
    (h) => parseInt(h.hour) >= 17 && parseInt(h.hour) < 22
  );
  const eveningSessions = eveningHours.reduce(
    (sum, h) => sum + h.session_count,
    0
  );
  if (eveningSessions / totalSessions > 0.3) {
    patterns.push({
      name: 'Evening Engineer',
      description: 'Most active in the evening (5pm-10pm)',
      hourRange: [17, 22],
      frequency: eveningSessions,
      confidence: Math.min(95, (eveningSessions / totalSessions) * 100),
    });
  }

  // Night owl pattern (10pm - 6am)
  const nightHours = hourlyStats.filter(
    (h) => parseInt(h.hour) >= 22 || parseInt(h.hour) < 6
  );
  const nightSessions = nightHours.reduce((sum, h) => sum + h.session_count, 0);
  if (nightSessions / totalSessions > 0.2) {
    patterns.push({
      name: 'Night Owl',
      description: 'Codes late into the night (10pm-6am)',
      hourRange: [22, 6],
      frequency: nightSessions,
      confidence: Math.min(95, (nightSessions / totalSessions) * 100),
    });
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect day-of-week patterns
 */
export function detectDayPatterns(db: Database.Database): DayPattern[] {
  const patterns: DayPattern[] = [];

  const dailyStats = db
    .prepare(
      `
    SELECT
      strftime('%w', start_time) as day_of_week,
      COUNT(*) as session_count
    FROM sessions
    WHERE start_time >= datetime('now', '-30 days')
    GROUP BY day_of_week
  `
    )
    .all() as any[];

  const totalSessions = dailyStats.reduce(
    (sum, d) => sum + d.session_count,
    0
  );

  // Weekend warrior (Sat/Sun)
  const weekendDays = dailyStats.filter((d) =>
    ['0', '6'].includes(d.day_of_week)
  );
  const weekendSessions = weekendDays.reduce(
    (sum, d) => sum + d.session_count,
    0
  );
  if (weekendSessions / totalSessions > 0.35) {
    patterns.push({
      name: 'Weekend Warrior',
      description: 'Most active on weekends',
      days: [0, 6],
      frequency: weekendSessions,
      confidence: Math.min(95, (weekendSessions / totalSessions) * 100 * 1.5),
    });
  }

  // Weekday grinder (Mon-Fri)
  const weekdayDays = dailyStats.filter((d) =>
    ['1', '2', '3', '4', '5'].includes(d.day_of_week)
  );
  const weekdaySessions = weekdayDays.reduce(
    (sum, d) => sum + d.session_count,
    0
  );
  if (weekdaySessions / totalSessions > 0.6) {
    patterns.push({
      name: 'Weekday Grinder',
      description: 'Consistent weekday productivity',
      days: [1, 2, 3, 4, 5],
      frequency: weekdaySessions,
      confidence: Math.min(95, (weekdaySessions / totalSessions) * 100),
    });
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect project focus patterns
 */
export function detectFocusPatterns(db: Database.Database): FocusPattern[] {
  const patterns: FocusPattern[] = [];

  const projectStats = db
    .prepare(
      `
    SELECT
      project,
      COUNT(*) as session_count,
      SUM(duration_ms) as total_duration
    FROM sessions
    WHERE start_time >= datetime('now', '-30 days')
    GROUP BY project
    ORDER BY total_duration DESC
  `
    )
    .all() as any[];

  if (projectStats.length === 0) return patterns;

  const totalSessions = projectStats.reduce(
    (sum, p) => sum + p.session_count,
    0
  );
  const totalDuration = projectStats.reduce(
    (sum, p) => sum + p.total_duration,
    0
  );

  // Single project focus
  const topProject = projectStats[0];
  if (topProject.total_duration / totalDuration > 0.5) {
    const projectName = topProject.project.split('/').pop();
    patterns.push({
      name: 'Single Project Focus',
      description: `Deep focus on ${projectName}`,
      projectPatterns: [topProject.project],
      frequency: topProject.session_count,
      confidence: Math.min(
        95,
        (topProject.total_duration / totalDuration) * 100
      ),
    });
  }

  // Multi-project juggler
  if (projectStats.length >= 5) {
    const top5Duration = projectStats
      .slice(0, 5)
      .reduce((sum, p) => sum + p.total_duration, 0);
    if (top5Duration / totalDuration < 0.8) {
      patterns.push({
        name: 'Multi-Project Juggler',
        description: `Active across ${projectStats.length} projects`,
        projectPatterns: projectStats.map((p) => p.project),
        frequency: totalSessions,
        confidence: Math.min(85, projectStats.length * 10),
      });
    }
  }

  // Context switcher (many short sessions)
  const avgSessionDuration = totalDuration / totalSessions;
  const shortSessions = projectStats.filter(
    (p) => p.total_duration / p.session_count < avgSessionDuration * 0.5
  );
  if (shortSessions.length / projectStats.length > 0.4) {
    patterns.push({
      name: 'Context Switcher',
      description: 'Frequent project switching with short sessions',
      projectPatterns: shortSessions.map((p) => p.project),
      frequency: shortSessions.reduce((sum, p) => sum + p.session_count, 0),
      confidence: Math.min(
        90,
        (shortSessions.length / projectStats.length) * 100
      ),
    });
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate productivity streak
 */
export function calculateStreak(db: Database.Database): {
  current: number;
  longest: number;
  lastActive: Date | null;
} {
  const recentDays = db
    .prepare(
      `
    SELECT DISTINCT DATE(start_time) as date
    FROM sessions
    WHERE start_time >= datetime('now', '-90 days')
    ORDER BY date DESC
  `
    )
    .all() as any[];

  if (recentDays.length === 0) {
    return { current: 0, longest: 0, lastActive: null };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  const today = format(new Date(), 'yyyy-MM-dd');
  let lastActiveDate: Date | null = null;

  // Calculate current streak
  for (let i = 0; i < recentDays.length; i++) {
    const dayDate = recentDays[i].date;
    const expectedDate = format(
      new Date(new Date().setDate(new Date().getDate() - i)),
      'yyyy-MM-dd'
    );

    if (i === 0) {
      lastActiveDate = parseISO(dayDate);
    }

    if (dayDate === expectedDate) {
      currentStreak++;
      tempStreak++;
    } else {
      break;
    }
  }

  // Calculate longest streak
  tempStreak = 1;
  for (let i = 1; i < recentDays.length; i++) {
    const currentDate = parseISO(recentDays[i].date);
    const prevDate = parseISO(recentDays[i - 1].date);
    const diff = differenceInDays(prevDate, currentDate);

    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    current: currentStreak,
    longest: longestStreak,
    lastActive: lastActiveDate,
  };
}

/**
 * Detect all habit patterns
 */
export function detectAllPatterns(
  db: Database.Database
): {
  timePatterns: TimePattern[];
  dayPatterns: DayPattern[];
  focusPatterns: FocusPattern[];
  streak: { current: number; longest: number; lastActive: Date | null };
} {
  return {
    timePatterns: detectTimePatterns(db),
    dayPatterns: detectDayPatterns(db),
    focusPatterns: detectFocusPatterns(db),
    streak: calculateStreak(db),
  };
}
