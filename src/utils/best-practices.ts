/**
 * Best Practice Recommendations
 *
 * Provides personalized best practice recommendations based on usage patterns
 */

import type Database from 'better-sqlite3';

export interface Recommendation {
  category: 'cost' | 'productivity' | 'quality' | 'workflow';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionItems: string[];
}

/**
 * Generate personalized best practice recommendations
 */
export function generateRecommendations(
  db: Database.Database
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Analyze overall stats
  const overallStats = db
    .prepare(
      `
    SELECT
      COUNT(DISTINCT project) as project_count,
      COUNT(*) as session_count,
      AVG(prompt_count) as avg_prompts,
      SUM(prompt_count) as total_prompts,
      AVG(duration_ms / 1000.0 / 60.0) as avg_duration_minutes
    FROM sessions
    WHERE start_time >= datetime('now', '-30 days')
  `
    )
    .get() as any;

  const projectStats = db
    .prepare(
      `
    SELECT
      COUNT(*) as project_count,
      SUM(total_cost) as total_cost,
      SUM(cache_creation_tokens + cache_read_tokens) as total_cache_tokens,
      SUM(input_tokens + output_tokens) as total_regular_tokens
    FROM projects
  `
    )
    .get() as any;

  // Cost optimization recommendations
  if (projectStats.total_cost > 50) {
    const cacheRatio =
      projectStats.total_cache_tokens /
      (projectStats.total_cache_tokens + projectStats.total_regular_tokens);

    if (cacheRatio < 0.5) {
      recommendations.push({
        category: 'cost',
        priority: 'high',
        title: 'Enable Prompt Caching Across More Projects',
        description:
          'You could save significant costs by enabling prompt caching in more projects',
        impact: `Potential savings: $${(projectStats.total_cost * 0.3).toFixed(2)}/month`,
        actionItems: [
          'Create .claude/CLAUDE.md files in active projects',
          'Document project context and common patterns',
          'Keep context files stable (avoid frequent changes)',
        ],
      });
    }
  }

  // Productivity recommendations
  if (overallStats.avg_prompts < 5) {
    recommendations.push({
      category: 'productivity',
      priority: 'medium',
      title: 'Increase Session Depth',
      description:
        'Your sessions tend to be short. Longer, focused sessions are more productive',
      impact: 'Better context retention and deeper problem-solving',
      actionItems: [
        'Plan 30-60 minute focused coding blocks',
        'Batch related tasks together',
        'Use TODO lists within sessions to stay on track',
      ],
    });
  }

  if (overallStats.avg_duration_minutes < 10) {
    recommendations.push({
      category: 'productivity',
      priority: 'medium',
      title: 'Extend Session Length',
      description: 'Very short sessions may indicate context switching',
      impact: 'Reduce context switching overhead',
      actionItems: [
        'Block dedicated time for coding',
        'Minimize distractions during sessions',
        'Complete full features in single sessions when possible',
      ],
    });
  }

  // Quality recommendations
  const recentProjects = db
    .prepare(
      `
    SELECT
      project,
      COUNT(*) as session_count,
      AVG(prompt_count) as avg_prompts
    FROM sessions
    WHERE start_time >= datetime('now', '-30 days')
    GROUP BY project
    HAVING session_count >= 3
  `
    )
    .all() as any[];

  const variableSessionProjects = recentProjects.filter(
    (p: any) => p.avg_prompts > 15
  );

  if (variableSessionProjects.length > 0) {
    recommendations.push({
      category: 'quality',
      priority: 'low',
      title: 'Break Down Complex Tasks',
      description:
        'Some sessions have many prompts, which can indicate unclear requirements',
      impact: 'Clearer goals and faster iteration',
      actionItems: [
        'Start sessions with clear objectives',
        'Break large features into smaller tasks',
        'Use plan mode for complex features',
      ],
    });
  }

  // Workflow recommendations
  if (overallStats.project_count > 10) {
    const contextSwitches = db
      .prepare(
        `
      SELECT COUNT(*) as switches
      FROM (
        SELECT
          session_id,
          project,
          LAG(project) OVER (ORDER BY start_time) as prev_project
        FROM sessions
        WHERE start_time >= datetime('now', '-30 days')
      )
      WHERE project != prev_project
    `
      )
      .get() as any;

    const switchRate =
      (contextSwitches.switches || 0) / (overallStats.session_count || 1);

    if (switchRate > 0.5) {
      recommendations.push({
        category: 'workflow',
        priority: 'medium',
        title: 'Reduce Project Context Switching',
        description: `You switch between ${overallStats.project_count} projects frequently`,
        impact: 'Improved focus and reduced mental overhead',
        actionItems: [
          'Dedicate specific days to specific projects',
          'Batch similar work across projects',
          'Use time blocking for project work',
        ],
      });
    }
  }

  // Cache-specific recommendations
  const cacheStats = db
    .prepare(
      `
    SELECT
      AVG((cache_read_tokens * 1.0 / (cache_creation_tokens + cache_read_tokens)) * 100) as avg_hit_ratio
    FROM projects
    WHERE cache_creation_tokens > 0 AND cache_read_tokens > 0
  `
    )
    .get() as any;

  if (cacheStats.avg_hit_ratio && cacheStats.avg_hit_ratio < 70) {
    recommendations.push({
      category: 'cost',
      priority: 'high',
      title: 'Improve Cache Hit Ratio',
      description: `Average cache hit ratio is ${cacheStats.avg_hit_ratio.toFixed(1)}%`,
      impact: 'Reduce costs by 20-40%',
      actionItems: [
        'Keep CLAUDE.md stable (avoid frequent updates)',
        'Structure prompts consistently',
        'Reference cached context in prompts',
      ],
    });
  }

  // Streak recommendations
  const streakData = db
    .prepare(
      `
    SELECT COUNT(DISTINCT DATE(start_time)) as active_days
    FROM sessions
    WHERE start_time >= datetime('now', '-7 days')
  `
    )
    .get() as any;

  if (streakData.active_days >= 5) {
    recommendations.push({
      category: 'productivity',
      priority: 'low',
      title: 'Great Consistency!',
      description: `You've been active ${streakData.active_days} days this week`,
      impact: 'Momentum builds skills faster',
      actionItems: [
        'Keep the streak going',
        'Consider increasing session depth',
        'Share your productivity patterns',
      ],
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}

/**
 * Get skill development recommendations
 */
export function getSkillRecommendations(
  db: Database.Database
): Array<{
  skill: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  nextSteps: string[];
}> {
  const recommendations: Array<{
    skill: string;
    currentLevel: 'beginner' | 'intermediate' | 'advanced';
    nextSteps: string[];
  }> = [];

  // Analyze prompt patterns for skill indicators
  const sessionCount = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM sessions
    WHERE start_time >= datetime('now', '-30 days')
  `
    )
    .get() as any;

  const avgSessionLength = db
    .prepare(
      `
    SELECT AVG(prompt_count) as avg
    FROM sessions
    WHERE start_time >= datetime('now', '-30 days')
  `
    )
    .get() as any;

  // Claude Code usage skill
  if (sessionCount.count < 20) {
    recommendations.push({
      skill: 'Claude Code Basics',
      currentLevel: 'beginner',
      nextSteps: [
        'Explore different commands (week, month, cost)',
        'Set up CLAUDE.md in main projects',
        'Learn about prompt caching',
      ],
    });
  } else if (sessionCount.count < 100) {
    recommendations.push({
      skill: 'Claude Code Proficiency',
      currentLevel: 'intermediate',
      nextSteps: [
        'Optimize cache hit ratios',
        'Use plan mode for complex features',
        'Create custom slash commands',
      ],
    });
  } else {
    recommendations.push({
      skill: 'Claude Code Mastery',
      currentLevel: 'advanced',
      nextSteps: [
        'Share productivity patterns with team',
        'Create custom hooks and automation',
        'Mentor others on AI-assisted development',
      ],
    });
  }

  return recommendations;
}
