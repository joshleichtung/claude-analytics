/**
 * Context Efficiency Analysis
 *
 * Analyzes how efficiently context (tokens) is being used
 */

import type Database from 'better-sqlite3';

/**
 * Context efficiency metrics
 */
export interface ContextEfficiency {
  cacheHitRatio: number; // 0-100
  averagePromptsPerSession: number;
  averageSessionLength: number; // minutes
  contextResets: number; // estimated times user had to start fresh
  efficiency: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

/**
 * Calculate context efficiency metrics
 */
export function analyzeContextEfficiency(
  db: Database.Database
): ContextEfficiency {
  const recommendations: string[] = [];

  // Get cache statistics
  const cacheStats = db
    .prepare(
      `
    SELECT
      SUM(cache_creation_tokens) as total_creation,
      SUM(cache_read_tokens) as total_read
    FROM projects
  `
    )
    .get() as any;

  const cacheTotal =
    (cacheStats.total_creation || 0) + (cacheStats.total_read || 0);
  const cacheHitRatio =
    cacheTotal > 0
      ? ((cacheStats.total_read || 0) / cacheTotal) * 100
      : 0;

  // Get session metrics
  const sessionStats = db
    .prepare(
      `
    SELECT
      AVG(prompt_count) as avg_prompts,
      AVG(duration_ms / 1000.0 / 60.0) as avg_duration_minutes,
      COUNT(*) as total_sessions
    FROM sessions
    WHERE start_time >= datetime('now', '-30 days')
  `
    )
    .get() as any;

  const averagePromptsPerSession = sessionStats.avg_prompts || 0;
  const averageSessionLength = sessionStats.avg_duration_minutes || 0;

  // Estimate context resets (sessions with very short duration and few prompts)
  const shortSessions = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM sessions
    WHERE start_time >= datetime('now', '-30 days')
      AND prompt_count <= 2
      AND duration_ms < 60000
  `
    )
    .get() as any;

  const contextResets = shortSessions.count || 0;

  // Generate recommendations
  if (cacheHitRatio < 50) {
    recommendations.push(
      'Low cache hit ratio - add CLAUDE.md files to enable prompt caching'
    );
  }

  if (cacheHitRatio >= 90) {
    recommendations.push(
      'Excellent cache utilization! Your context setup is working well'
    );
  }

  if (averagePromptsPerSession < 3) {
    recommendations.push(
      'Short sessions detected - consider batching related tasks together'
    );
  }

  if (averagePromptsPerSession > 20) {
    recommendations.push(
      'Long sessions detected - break complex tasks into smaller, focused sessions'
    );
  }

  if (contextResets > sessionStats.total_sessions * 0.2) {
    recommendations.push(
      'Many context resets detected - work in longer, more focused sessions'
    );
  }

  if (averageSessionLength < 5) {
    recommendations.push(
      'Very short sessions - aim for 15-30 minute focused coding blocks'
    );
  }

  if (averageSessionLength > 120) {
    recommendations.push(
      'Very long sessions - take breaks and clear context periodically for fresh perspective'
    );
  }

  // Determine overall efficiency
  let efficiency: 'excellent' | 'good' | 'fair' | 'poor';
  if (cacheHitRatio >= 80 && averagePromptsPerSession >= 5) {
    efficiency = 'excellent';
  } else if (cacheHitRatio >= 60 && averagePromptsPerSession >= 3) {
    efficiency = 'good';
  } else if (cacheHitRatio >= 40 || averagePromptsPerSession >= 2) {
    efficiency = 'fair';
  } else {
    efficiency = 'poor';
  }

  return {
    cacheHitRatio: parseFloat(cacheHitRatio.toFixed(1)),
    averagePromptsPerSession: parseFloat(averagePromptsPerSession.toFixed(1)),
    averageSessionLength: parseFloat(averageSessionLength.toFixed(1)),
    contextResets,
    efficiency,
    recommendations,
  };
}

/**
 * Get projects that could benefit from better context management
 */
export function getContextOptimizationOpportunities(
  db: Database.Database
): Array<{
  project: string;
  issue: string;
  recommendation: string;
  potentialSavings: string;
}> {
  const opportunities: Array<{
    project: string;
    issue: string;
    recommendation: string;
    potentialSavings: string;
  }> = [];

  // Projects with no caching
  const noCacheProjects = db
    .prepare(
      `
    SELECT
      project_path,
      total_prompts,
      total_cost,
      input_tokens,
      output_tokens
    FROM projects
    WHERE cache_creation_tokens = 0
      AND cache_read_tokens = 0
      AND total_prompts > 10
    ORDER BY total_cost DESC
    LIMIT 5
  `
    )
    .all() as any[];

  noCacheProjects.forEach((proj) => {
    const potentialCacheSavings = (proj.input_tokens * 0.1 * 0.75) / 1000000; // Estimate 75% cache hit on 90% of input
    opportunities.push({
      project: proj.project_path,
      issue: 'No prompt caching enabled',
      recommendation: 'Add .claude/CLAUDE.md with project context',
      potentialSavings: `~$${potentialCacheSavings.toFixed(2)}/month`,
    });
  });

  // Projects with poor cache hit ratio
  const poorCacheProjects = db
    .prepare(
      `
    SELECT
      project_path,
      total_prompts,
      total_cost,
      cache_creation_tokens,
      cache_read_tokens,
      (cache_read_tokens * 1.0 / (cache_creation_tokens + cache_read_tokens)) * 100 as hit_ratio
    FROM projects
    WHERE cache_creation_tokens > 0
      AND cache_read_tokens > 0
      AND total_prompts > 10
      AND (cache_read_tokens * 1.0 / (cache_creation_tokens + cache_read_tokens)) < 0.5
    ORDER BY total_cost DESC
    LIMIT 5
  `
    )
    .all() as any[];

  poorCacheProjects.forEach((proj) => {
    opportunities.push({
      project: proj.project_path,
      issue: `Low cache hit ratio (${proj.hit_ratio.toFixed(1)}%)`,
      recommendation:
        'Structure CLAUDE.md consistently, avoid changing context frequently',
      potentialSavings: 'Improve by 40-50%',
    });
  });

  // Projects with high output/input ratio
  const verboseProjects = db
    .prepare(
      `
    SELECT
      project_path,
      total_prompts,
      total_cost,
      input_tokens,
      output_tokens,
      (output_tokens * 1.0 / input_tokens) as ratio
    FROM projects
    WHERE output_tokens > input_tokens * 3
      AND total_prompts > 10
    ORDER BY ratio DESC
    LIMIT 5
  `
    )
    .all() as any[];

  verboseProjects.forEach((proj) => {
    opportunities.push({
      project: proj.project_path,
      issue: `High output/input ratio (${proj.ratio.toFixed(1)}:1)`,
      recommendation:
        'Request more concise responses or break down prompts',
      potentialSavings: 'Reduce output tokens by 30-50%',
    });
  });

  return opportunities;
}
