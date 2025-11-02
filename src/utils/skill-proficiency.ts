/**
 * Skill Proficiency Scoring
 *
 * Calculates proficiency levels based on usage patterns
 */

import type Database from 'better-sqlite3';
import { detectSkillsFromPath, getSkillDefinition, SKILL_TAXONOMY } from './skill-taxonomy.js';
import { differenceInDays, parseISO } from 'date-fns';

export interface SkillProficiency {
  skill: string;
  category: 'framework' | 'language' | 'tool' | 'platform' | 'concept';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  proficiency: number; // 0-100
  usageCount: number; // Number of sessions
  firstUsed: Date;
  lastUsed: Date;
  daysSinceFirstUse: number;
  consistency: number; // 0-100, how regularly it's used
  depth: number; // 0-100, average session depth
  relatedSkills: string[];
  nextMilestone: string;
}

/**
 * Calculate proficiency score for a skill
 */
function calculateProficiencyScore(metrics: {
  usageCount: number;
  daysSinceFirstUse: number;
  consistency: number;
  depth: number;
}): number {
  // Weighted formula:
  // - 40% usage count (logarithmic scale)
  // - 20% time investment (days of experience)
  // - 20% consistency (regular use)
  // - 20% depth (session quality)

  const usageScore = Math.min(100, Math.log10(metrics.usageCount + 1) * 40);
  const timeScore = Math.min(100, (metrics.daysSinceFirstUse / 365) * 50);
  const consistencyScore = metrics.consistency;
  const depthScore = metrics.depth;

  return (
    usageScore * 0.4 +
    timeScore * 0.2 +
    consistencyScore * 0.2 +
    depthScore * 0.2
  );
}

/**
 * Determine proficiency level from score
 */
function getProficiencyLevel(
  score: number
): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (score >= 80) return 'expert';
  if (score >= 60) return 'advanced';
  if (score >= 30) return 'intermediate';
  return 'beginner';
}

/**
 * Get next milestone for a skill level
 */
function getNextMilestone(
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert',
  usageCount: number
): string {
  switch (level) {
    case 'beginner':
      const sessionsNeeded = Math.max(0, 10 - usageCount);
      return sessionsNeeded > 0
        ? `${sessionsNeeded} more sessions to reach intermediate`
        : 'Ready for intermediate level!';
    case 'intermediate':
      const advancedNeeded = Math.max(0, 50 - usageCount);
      return advancedNeeded > 0
        ? `${advancedNeeded} more sessions to reach advanced`
        : 'Ready for advanced level!';
    case 'advanced':
      const expertNeeded = Math.max(0, 150 - usageCount);
      return expertNeeded > 0
        ? `${expertNeeded} more sessions to reach expert`
        : 'Ready for expert level!';
    case 'expert':
      return 'Mastery achieved! Consider mentoring others';
  }
}

/**
 * Analyze skill proficiency from database
 */
export function analyzeSkillProficiency(
  db: Database.Database
): SkillProficiency[] {
  const proficiencies: SkillProficiency[] = [];

  // Get all projects and their sessions
  const projects = db
    .prepare(
      `
    SELECT
      project,
      COUNT(*) as session_count,
      AVG(prompt_count) as avg_prompts,
      MIN(start_time) as first_session,
      MAX(start_time) as last_session
    FROM sessions
    GROUP BY project
    HAVING session_count > 0
  `
    )
    .all() as any[];

  // Track skills across all projects
  const skillMap = new Map<
    string,
    {
      sessions: number;
      firstUsed: Date;
      lastUsed: Date;
      avgDepth: number;
      projects: string[];
    }
  >();

  for (const project of projects) {
    const skills = detectSkillsFromPath(project.project);

    for (const skill of skills) {
      const existing = skillMap.get(skill);
      const firstUsed = parseISO(project.first_session);
      const lastUsed = parseISO(project.last_session);

      if (existing) {
        existing.sessions += project.session_count;
        existing.firstUsed =
          firstUsed < existing.firstUsed ? firstUsed : existing.firstUsed;
        existing.lastUsed =
          lastUsed > existing.lastUsed ? lastUsed : existing.lastUsed;
        existing.avgDepth =
          (existing.avgDepth + project.avg_prompts) / 2;
        existing.projects.push(project.project);
      } else {
        skillMap.set(skill, {
          sessions: project.session_count,
          firstUsed,
          lastUsed,
          avgDepth: project.avg_prompts,
          projects: [project.project],
        });
      }
    }
  }

  // Calculate proficiency for each skill
  for (const [skill, data] of skillMap.entries()) {
    const daysSinceFirstUse = differenceInDays(new Date(), data.firstUsed);
    const daysSinceLastUse = differenceInDays(new Date(), data.lastUsed);

    // Consistency: how recently and regularly used
    const recencyScore = Math.max(0, 100 - daysSinceLastUse * 2);
    const regularityScore = Math.min(
      100,
      (data.sessions / Math.max(1, daysSinceFirstUse)) * 100
    );
    const consistency = (recencyScore + regularityScore) / 2;

    // Depth: average session quality (prompts per session)
    const depth = Math.min(100, (data.avgDepth / 10) * 100);

    const proficiencyScore = calculateProficiencyScore({
      usageCount: data.sessions,
      daysSinceFirstUse,
      consistency,
      depth,
    });

    const level = getProficiencyLevel(proficiencyScore);
    const skillDef = getSkillDefinition(skill);

    proficiencies.push({
      skill,
      category: skillDef?.category || 'concept',
      level,
      proficiency: Math.round(proficiencyScore),
      usageCount: data.sessions,
      firstUsed: data.firstUsed,
      lastUsed: data.lastUsed,
      daysSinceFirstUse,
      consistency: Math.round(consistency),
      depth: Math.round(depth),
      relatedSkills: skillDef?.relatedSkills || [],
      nextMilestone: getNextMilestone(level, data.sessions),
    });
  }

  // Sort by proficiency score descending
  return proficiencies.sort((a, b) => b.proficiency - a.proficiency);
}

/**
 * Get skill progress over time
 */
export function getSkillProgress(
  db: Database.Database,
  skillName: string
): Array<{
  month: string;
  sessions: number;
  avgDepth: number;
}> {
  // Get monthly progress for a specific skill
  const allProjects = db
    .prepare(
      `
    SELECT project
    FROM sessions
    GROUP BY project
  `
    )
    .all() as any[];

  const relevantProjects = allProjects
    .filter((p) => detectSkillsFromPath(p.project).includes(skillName))
    .map((p) => p.project);

  if (relevantProjects.length === 0) {
    return [];
  }

  const placeholders = relevantProjects.map(() => '?').join(',');
  const monthlyData = db
    .prepare(
      `
    SELECT
      strftime('%Y-%m', start_time) as month,
      COUNT(*) as sessions,
      AVG(prompt_count) as avg_depth
    FROM sessions
    WHERE project IN (${placeholders})
    GROUP BY month
    ORDER BY month ASC
  `
    )
    .all(...relevantProjects) as any[];

  return monthlyData.map((d) => ({
    month: d.month,
    sessions: d.sessions,
    avgDepth: parseFloat(d.avg_depth.toFixed(1)),
  }));
}

/**
 * Get skill comparison
 */
export function compareSkills(
  proficiencies: SkillProficiency[]
): {
  strongest: SkillProficiency[];
  emerging: SkillProficiency[];
  needsPractice: SkillProficiency[];
} {
  const sorted = [...proficiencies].sort((a, b) => b.proficiency - a.proficiency);

  return {
    strongest: sorted.slice(0, 5).filter((s) => s.proficiency >= 60),
    emerging: sorted
      .filter(
        (s) =>
          s.level === 'intermediate' &&
          differenceInDays(new Date(), s.firstUsed) < 90
      )
      .slice(0, 3),
    needsPractice: sorted
      .filter(
        (s) =>
          s.consistency < 50 &&
          differenceInDays(new Date(), s.lastUsed) > 30
      )
      .slice(0, 3),
  };
}
