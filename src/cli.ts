#!/usr/bin/env node

/**
 * Claude Analytics CLI
 *
 * Command-line interface for viewing Claude Code usage analytics
 */

import { Command } from 'commander';
import { getDatabase, closeDatabase } from './database/db.js';
import { syncData } from './utils/sync.js';
import chalk from 'chalk';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, formatDuration, format, subDays, eachDayOfInterval } from 'date-fns';
import { writeFileSync } from 'fs';
import { detectAllPatterns } from './utils/habit-detector.js';
import { analyzeContextEfficiency, getContextOptimizationOpportunities } from './utils/context-efficiency.js';
import { generateRecommendations, getSkillRecommendations } from './utils/best-practices.js';
import { analyzeSkillProficiency, getSkillProgress, compareSkills } from './utils/skill-proficiency.js';

const program = new Command();

program
  .name('claude-stats')
  .description('Analytics and habit tracking for Claude Code usage')
  .version('1.0.0');

/**
 * Sync command - sync data from history and config
 */
program
  .command('sync')
  .description('Sync data from ~/.claude/history.jsonl and ~/.claude.json')
  .action(() => {
    console.log(chalk.cyan.bold('Claude Analytics - Data Sync\n'));

    const db = getDatabase();
    try {
      const result = syncData(db);

      console.log(chalk.green('\n✓ Sync completed successfully\n'));
      console.log(chalk.bold('Summary:'));
      console.log(`  Prompts processed: ${chalk.yellow(result.promptsProcessed)}`);
      console.log(`  Sessions created: ${chalk.yellow(result.sessionsCreated)}`);
      console.log(`  Projects updated: ${chalk.yellow(result.projectsUpdated)}`);

      if (result.errors.length > 0) {
        console.log(chalk.red(`\n⚠ ${result.errors.length} errors occurred:`));
        result.errors.forEach((error) => console.log(chalk.red(`  - ${error}`)));
      }
    } catch (error) {
      console.error(chalk.red('✗ Sync failed:'), error);
      process.exit(1);
    } finally {
      closeDatabase(db);
    }
  });

/**
 * Today command - show today's stats
 */
program
  .command('today')
  .description("Show today's usage statistics")
  .action(() => {
    console.log(chalk.cyan.bold('Claude Analytics - Today\n'));

    const db = getDatabase();
    try {
      const today = new Date();
      const startTime = startOfDay(today).toISOString();
      const endTime = endOfDay(today).toISOString();

      // Get today's sessions
      const sessions = db
        .prepare(
          `
        SELECT
          COUNT(*) as session_count,
          SUM(prompt_count) as total_prompts,
          SUM(duration_ms) as total_duration,
          COUNT(DISTINCT project) as unique_projects
        FROM sessions
        WHERE start_time >= ? AND start_time <= ?
      `
        )
        .get(startTime, endTime) as any;

      console.log(chalk.bold('Overview:'));
      console.log(`  Sessions: ${chalk.yellow(sessions.session_count || 0)}`);
      console.log(`  Prompts: ${chalk.yellow(sessions.total_prompts || 0)}`);
      console.log(`  Projects: ${chalk.yellow(sessions.unique_projects || 0)}`);
      console.log(
        `  Total time: ${chalk.yellow(formatDuration({ seconds: Math.floor((sessions.total_duration || 0) / 1000) }))}`
      );

      // Get top projects today
      const topProjects = db
        .prepare(
          `
        SELECT
          project,
          COUNT(*) as session_count,
          SUM(prompt_count) as total_prompts,
          SUM(duration_ms) as total_duration
        FROM sessions
        WHERE start_time >= ? AND start_time <= ?
        GROUP BY project
        ORDER BY total_duration DESC
        LIMIT 5
      `
        )
        .all(startTime, endTime) as any[];

      if (topProjects.length > 0) {
        console.log(chalk.bold('\nTop Projects:'));
        topProjects.forEach((proj, index) => {
          const projectName = proj.project.split('/').pop() || proj.project;
          const duration = formatDuration({
            seconds: Math.floor(proj.total_duration / 1000),
          });
          console.log(
            `  ${index + 1}. ${chalk.cyan(projectName)} - ${proj.total_prompts} prompts, ${duration}`
          );
        });
      }
    } catch (error) {
      console.error(chalk.red('✗ Failed to fetch stats:'), error);
      process.exit(1);
    } finally {
      closeDatabase(db);
    }
  });

/**
 * Projects command - list all projects with stats
 */
program
  .command('projects')
  .description('List all projects with statistics')
  .option('-l, --limit <number>', 'Limit number of projects shown', '10')
  .option('-s, --sort <field>', 'Sort by: prompts, cost, duration', 'duration')
  .action((options) => {
    console.log(chalk.cyan.bold('Claude Analytics - Projects\n'));

    const db = getDatabase();
    try {
      const limit = parseInt(options.limit);
      let sortField = 'total_duration_ms';

      if (options.sort === 'prompts') {
        sortField = 'total_prompts';
      } else if (options.sort === 'cost') {
        sortField = 'total_cost';
      }

      const projects = db
        .prepare(
          `
        SELECT
          project_path,
          total_prompts,
          total_sessions,
          total_duration_ms,
          total_cost,
          lines_added,
          lines_removed,
          last_active
        FROM projects
        ORDER BY ${sortField} DESC
        LIMIT ?
      `
        )
        .all(limit) as any[];

      if (projects.length === 0) {
        console.log(chalk.yellow('No projects found. Run "claude-stats sync" first.'));
        return;
      }

      console.log(chalk.bold(`Top ${projects.length} Projects (sorted by ${options.sort}):\n`));

      projects.forEach((proj, index) => {
        const projectName = proj.project_path.split('/').pop() || proj.project_path;
        const duration = formatDuration({
          seconds: Math.floor(proj.total_duration_ms / 1000),
        });
        const lastActive = format(new Date(proj.last_active), 'MMM d, yyyy');

        console.log(chalk.cyan.bold(`${index + 1}. ${projectName}`));
        console.log(`   Path: ${chalk.dim(proj.project_path)}`);
        console.log(
          `   Stats: ${proj.total_prompts} prompts, ${proj.total_sessions} sessions, ${duration}`
        );
        console.log(
          `   Code: +${proj.lines_added} / -${proj.lines_removed} lines`
        );
        if (proj.total_cost > 0) {
          console.log(`   Cost: $${proj.total_cost.toFixed(4)}`);
        }
        console.log(`   Last active: ${lastActive}\n`);
      });
    } catch (error) {
      console.error(chalk.red('✗ Failed to fetch projects:'), error);
      process.exit(1);
    } finally {
      closeDatabase(db);
    }
  });

/**
 * Week command - show this week's stats
 */
program
  .command('week')
  .description('Show this week\'s usage statistics')
  .action(() => {
    console.log(chalk.cyan.bold('Claude Analytics - This Week\n'));

    const db = getDatabase();
    try {
      const today = new Date();
      const startTime = startOfWeek(today, { weekStartsOn: 1 }).toISOString(); // Monday
      const endTime = endOfWeek(today, { weekStartsOn: 1 }).toISOString(); // Sunday

      // Get week's sessions
      const sessions = db
        .prepare(
          `
        SELECT
          COUNT(*) as session_count,
          SUM(prompt_count) as total_prompts,
          SUM(duration_ms) as total_duration,
          COUNT(DISTINCT project) as unique_projects
        FROM sessions
        WHERE start_time >= ? AND start_time <= ?
      `
        )
        .get(startTime, endTime) as any;

      const totalSeconds = Math.floor((sessions.total_duration || 0) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      console.log(chalk.bold('Week Overview:'));
      console.log(`  Sessions: ${chalk.yellow(sessions.session_count || 0)}`);
      console.log(`  Prompts: ${chalk.yellow(sessions.total_prompts || 0)}`);
      console.log(`  Projects: ${chalk.yellow(sessions.unique_projects || 0)}`);
      console.log(`  Total time: ${chalk.yellow(`${hours}h ${minutes}m`)}`);

      // Get daily breakdown
      const dailyStats = db
        .prepare(
          `
        SELECT
          DATE(start_time) as date,
          COUNT(*) as session_count,
          SUM(prompt_count) as total_prompts,
          SUM(duration_ms) as total_duration
        FROM sessions
        WHERE start_time >= ? AND start_time <= ?
        GROUP BY DATE(start_time)
        ORDER BY date ASC
      `
        )
        .all(startTime, endTime) as any[];

      if (dailyStats.length > 0) {
        console.log(chalk.bold('\nDaily Breakdown:'));
        dailyStats.forEach((day) => {
          const dayDate = new Date(day.date);
          const dayName = format(dayDate, 'EEE, MMM d');
          const daySeconds = Math.floor(day.total_duration / 1000);
          const dayHours = Math.floor(daySeconds / 3600);
          const dayMins = Math.floor((daySeconds % 3600) / 60);
          const timeStr = dayHours > 0 ? `${dayHours}h ${dayMins}m` : `${dayMins}m`;

          console.log(
            `  ${chalk.cyan(dayName)}: ${day.total_prompts} prompts, ${day.session_count} sessions, ${timeStr}`
          );
        });
      }

      // Get top projects this week
      const topProjects = db
        .prepare(
          `
        SELECT
          project,
          COUNT(*) as session_count,
          SUM(prompt_count) as total_prompts,
          SUM(duration_ms) as total_duration
        FROM sessions
        WHERE start_time >= ? AND start_time <= ?
        GROUP BY project
        ORDER BY total_duration DESC
        LIMIT 5
      `
        )
        .all(startTime, endTime) as any[];

      if (topProjects.length > 0) {
        console.log(chalk.bold('\nTop Projects:'));
        topProjects.forEach((proj, index) => {
          const projectName = proj.project.split('/').pop() || proj.project;
          const projSeconds = Math.floor(proj.total_duration / 1000);
          const projHours = Math.floor(projSeconds / 3600);
          const projMins = Math.floor((projSeconds % 3600) / 60);
          const timeStr = projHours > 0 ? `${projHours}h ${projMins}m` : `${projMins}m`;

          console.log(
            `  ${index + 1}. ${chalk.cyan(projectName)} - ${proj.total_prompts} prompts, ${timeStr}`
          );
        });
      }
    } catch (error) {
      console.error(chalk.red('✗ Failed to fetch stats:'), error);
      process.exit(1);
    } finally {
      closeDatabase(db);
    }
  });

/**
 * Month command - show this month's stats
 */
program
  .command('month')
  .description('Show this month\'s usage statistics')
  .action(() => {
    console.log(chalk.cyan.bold('Claude Analytics - This Month\n'));

    const db = getDatabase();
    try {
      const today = new Date();
      const startTime = startOfMonth(today).toISOString();
      const endTime = endOfMonth(today).toISOString();

      // Get month's sessions
      const sessions = db
        .prepare(
          `
        SELECT
          COUNT(*) as session_count,
          SUM(prompt_count) as total_prompts,
          SUM(duration_ms) as total_duration,
          COUNT(DISTINCT project) as unique_projects
        FROM sessions
        WHERE start_time >= ? AND start_time <= ?
      `
        )
        .get(startTime, endTime) as any;

      const totalSeconds = Math.floor((sessions.total_duration || 0) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      console.log(chalk.bold(`Month Overview (${format(today, 'MMMM yyyy')}):`));
      console.log(`  Sessions: ${chalk.yellow(sessions.session_count || 0)}`);
      console.log(`  Prompts: ${chalk.yellow(sessions.total_prompts || 0)}`);
      console.log(`  Projects: ${chalk.yellow(sessions.unique_projects || 0)}`);
      console.log(`  Total time: ${chalk.yellow(`${hours}h ${minutes}m`)}`);

      // Calculate averages
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const avgPromptsPerDay = Math.round((sessions.total_prompts || 0) / daysInMonth);
      const avgSessionsPerDay = ((sessions.session_count || 0) / daysInMonth).toFixed(1);

      console.log(chalk.bold('\nAverages:'));
      console.log(`  Prompts per day: ${chalk.yellow(avgPromptsPerDay)}`);
      console.log(`  Sessions per day: ${chalk.yellow(avgSessionsPerDay)}`);

      // Get weekly breakdown
      const weeklyStats = db
        .prepare(
          `
        SELECT
          strftime('%W', start_time) as week_num,
          MIN(DATE(start_time)) as week_start,
          COUNT(*) as session_count,
          SUM(prompt_count) as total_prompts,
          SUM(duration_ms) as total_duration
        FROM sessions
        WHERE start_time >= ? AND start_time <= ?
        GROUP BY strftime('%W', start_time)
        ORDER BY week_num ASC
      `
        )
        .all(startTime, endTime) as any[];

      if (weeklyStats.length > 0) {
        console.log(chalk.bold('\nWeekly Breakdown:'));
        weeklyStats.forEach((week, index) => {
          const weekStart = new Date(week.week_start);
          const weekLabel = format(weekStart, 'MMM d');
          const weekSeconds = Math.floor(week.total_duration / 1000);
          const weekHours = Math.floor(weekSeconds / 3600);
          const weekMins = Math.floor((weekSeconds % 3600) / 60);
          const timeStr = weekHours > 0 ? `${weekHours}h ${weekMins}m` : `${weekMins}m`;

          console.log(
            `  Week ${index + 1} (${chalk.cyan(weekLabel)}): ${week.total_prompts} prompts, ${week.session_count} sessions, ${timeStr}`
          );
        });
      }

      // Get top projects this month
      const topProjects = db
        .prepare(
          `
        SELECT
          project,
          COUNT(*) as session_count,
          SUM(prompt_count) as total_prompts,
          SUM(duration_ms) as total_duration
        FROM sessions
        WHERE start_time >= ? AND start_time <= ?
        GROUP BY project
        ORDER BY total_duration DESC
        LIMIT 5
      `
        )
        .all(startTime, endTime) as any[];

      if (topProjects.length > 0) {
        console.log(chalk.bold('\nTop Projects:'));
        topProjects.forEach((proj, index) => {
          const projectName = proj.project.split('/').pop() || proj.project;
          const projSeconds = Math.floor(proj.total_duration / 1000);
          const projHours = Math.floor(projSeconds / 3600);
          const projMins = Math.floor((projSeconds % 3600) / 60);
          const timeStr = projHours > 0 ? `${projHours}h ${projMins}m` : `${projMins}m`;

          console.log(
            `  ${index + 1}. ${chalk.cyan(projectName)} - ${proj.total_prompts} prompts, ${timeStr}`
          );
        });
      }
    } catch (error) {
      console.error(chalk.red('✗ Failed to fetch stats:'), error);
      process.exit(1);
    } finally {
      closeDatabase(db);
    }
  });

/**
 * Cost command - show cost breakdown by project
 */
program
  .command('cost')
  .description('Show cost breakdown by project')
  .option('-l, --limit <number>', 'Limit number of projects shown', '10')
  .option('--min <amount>', 'Minimum cost to display (e.g., 0.01)', '0')
  .action((options) => {
    console.log(chalk.cyan.bold('Claude Analytics - Cost Breakdown\n'));

    const db = getDatabase();
    try {
      const limit = parseInt(options.limit);
      const minCost = parseFloat(options.min);

      // Get total cost across all projects
      const totalCostResult = db
        .prepare(
          `
        SELECT SUM(total_cost) as total_cost
        FROM projects
        WHERE total_cost > ?
      `
        )
        .get(minCost) as any;

      const totalCost = totalCostResult.total_cost || 0;

      console.log(chalk.bold('Overall Cost:'));
      console.log(`  Total: ${chalk.yellow('$' + totalCost.toFixed(2))}\n`);

      // Get cost breakdown by project
      const projectCosts = db
        .prepare(
          `
        SELECT
          project_path,
          total_cost,
          total_prompts,
          input_tokens,
          output_tokens,
          cache_creation_tokens,
          cache_read_tokens
        FROM projects
        WHERE total_cost > ?
        ORDER BY total_cost DESC
        LIMIT ?
      `
        )
        .all(minCost, limit) as any[];

      if (projectCosts.length === 0) {
        console.log(chalk.yellow('No projects with costs found.'));
        return;
      }

      console.log(chalk.bold(`Top ${projectCosts.length} Projects by Cost:\n`));

      projectCosts.forEach((proj, index) => {
        const projectName = proj.project_path.split('/').pop() || proj.project_path;
        const costPercent = ((proj.total_cost / totalCost) * 100).toFixed(1);
        const costPerPrompt = proj.total_prompts > 0
          ? (proj.total_cost / proj.total_prompts).toFixed(4)
          : '0';

        console.log(chalk.cyan.bold(`${index + 1}. ${projectName}`));
        console.log(`   Total cost: ${chalk.yellow('$' + proj.total_cost.toFixed(4))} (${costPercent}% of total)`);
        console.log(`   Cost per prompt: ${chalk.yellow('$' + costPerPrompt)}`);
        console.log(`   Prompts: ${proj.total_prompts}`);

        // Token breakdown
        const totalTokens =
          (proj.input_tokens || 0) +
          (proj.output_tokens || 0) +
          (proj.cache_creation_tokens || 0) +
          (proj.cache_read_tokens || 0);

        if (totalTokens > 0) {
          console.log(`   Tokens:`);
          console.log(`     Input: ${(proj.input_tokens || 0).toLocaleString()}`);
          console.log(`     Output: ${(proj.output_tokens || 0).toLocaleString()}`);
          if (proj.cache_creation_tokens > 0) {
            console.log(`     Cache creation: ${proj.cache_creation_tokens.toLocaleString()}`);
          }
          if (proj.cache_read_tokens > 0) {
            console.log(`     Cache read: ${proj.cache_read_tokens.toLocaleString()}`);
          }
        }
        console.log();
      });

      // Show optimization tips
      console.log(chalk.bold('💡 Optimization Tips:'));

      // Check for high cost per prompt
      const highCostProjects = projectCosts.filter(p =>
        p.total_prompts > 0 && (p.total_cost / p.total_prompts) > 0.10
      );

      if (highCostProjects.length > 0) {
        console.log(chalk.yellow(`  • ${highCostProjects.length} projects have high cost per prompt (>$0.10)`));
        console.log(chalk.dim('    Consider using prompt caching or breaking down complex prompts'));
      }

      // Check cache usage
      const cacheStats = projectCosts.reduce((acc, p) => ({
        cacheCreation: acc.cacheCreation + (p.cache_creation_tokens || 0),
        cacheRead: acc.cacheRead + (p.cache_read_tokens || 0),
      }), { cacheCreation: 0, cacheRead: 0 });

      if (cacheStats.cacheCreation > 0 && cacheStats.cacheRead > 0) {
        const cacheHitRatio = (cacheStats.cacheRead / (cacheStats.cacheCreation + cacheStats.cacheRead) * 100).toFixed(1);
        console.log(`  • Cache hit ratio: ${cacheHitRatio}%`);
        if (parseFloat(cacheHitRatio) < 30) {
          console.log(chalk.dim('    Low cache hit ratio - consider structuring prompts for better caching'));
        }
      } else {
        console.log('  • Prompt caching not being used - consider enabling for repeated contexts');
      }

    } catch (error) {
      console.error(chalk.red('✗ Failed to fetch cost data:'), error);
      process.exit(1);
    } finally {
      closeDatabase(db);
    }
  });

/**
 * Optimize command - show token usage optimization suggestions
 */
program
  .command('optimize')
  .description('Show token usage optimization suggestions')
  .action(() => {
    console.log(chalk.cyan.bold('Claude Analytics - Optimization Suggestions\n'));

    const db = getDatabase();
    try {
      // Get overall token stats
      const overallStats = db
        .prepare(
          `
        SELECT
          SUM(input_tokens) as total_input,
          SUM(output_tokens) as total_output,
          SUM(cache_creation_tokens) as total_cache_creation,
          SUM(cache_read_tokens) as total_cache_read,
          SUM(total_cost) as total_cost,
          COUNT(*) as project_count
        FROM projects
      `
        )
        .get() as any;

      const totalTokens =
        (overallStats.total_input || 0) +
        (overallStats.total_output || 0) +
        (overallStats.total_cache_creation || 0) +
        (overallStats.total_cache_read || 0);

      console.log(chalk.bold('📊 Overall Token Usage:\n'));
      console.log(`  Input tokens: ${chalk.yellow((overallStats.total_input || 0).toLocaleString())}`);
      console.log(`  Output tokens: ${chalk.yellow((overallStats.total_output || 0).toLocaleString())}`);
      console.log(`  Cache creation: ${chalk.yellow((overallStats.total_cache_creation || 0).toLocaleString())}`);
      console.log(`  Cache read: ${chalk.yellow((overallStats.total_cache_read || 0).toLocaleString())}`);
      console.log(`  Total: ${chalk.yellow(totalTokens.toLocaleString())} tokens`);
      console.log(`  Total cost: ${chalk.yellow('$' + (overallStats.total_cost || 0).toFixed(2))}\n`);

      // Calculate cache efficiency
      const cacheTotal =
        (overallStats.total_cache_creation || 0) + (overallStats.total_cache_read || 0);
      const cacheHitRatio = cacheTotal > 0
        ? ((overallStats.total_cache_read / cacheTotal) * 100).toFixed(1)
        : '0';

      console.log(chalk.bold('💾 Cache Efficiency:\n'));
      console.log(`  Cache hit ratio: ${chalk.yellow(cacheHitRatio + '%')}`);

      if (parseFloat(cacheHitRatio) >= 80) {
        console.log(chalk.green('  ✓ Excellent cache utilization!'));
      } else if (parseFloat(cacheHitRatio) >= 50) {
        console.log(chalk.yellow('  ⚠ Good cache usage, but room for improvement'));
      } else if (parseFloat(cacheHitRatio) > 0) {
        console.log(chalk.red('  ✗ Poor cache utilization'));
      } else {
        console.log(chalk.red('  ✗ Prompt caching not being used'));
      }
      console.log();

      // Find inefficient projects
      console.log(chalk.bold('🎯 Optimization Opportunities:\n'));

      // Projects with no caching
      const noCacheProjects = db
        .prepare(
          `
        SELECT project_path, total_prompts, total_cost
        FROM projects
        WHERE cache_creation_tokens = 0 AND cache_read_tokens = 0
          AND total_prompts > 5
        ORDER BY total_cost DESC
        LIMIT 3
      `
        )
        .all() as any[];

      if (noCacheProjects.length > 0) {
        console.log(chalk.yellow('1. Enable Prompt Caching'));
        console.log(chalk.dim('   These projects could benefit from prompt caching:'));
        noCacheProjects.forEach((proj) => {
          const name = proj.project_path.split('/').pop();
          console.log(chalk.dim(`     • ${name} (${proj.total_prompts} prompts, $${proj.total_cost.toFixed(2)})`));
        });
        console.log(chalk.dim('   → Add repeated context (CLAUDE.md, etc.) to enable caching\n'));
      }

      // Projects with high output/input ratio
      const highOutputProjects = db
        .prepare(
          `
        SELECT
          project_path,
          total_prompts,
          input_tokens,
          output_tokens,
          total_cost
        FROM projects
        WHERE output_tokens > input_tokens * 2
          AND total_prompts > 5
        ORDER BY (output_tokens * 1.0 / input_tokens) DESC
        LIMIT 3
      `
        )
        .all() as any[];

      if (highOutputProjects.length > 0) {
        console.log(chalk.yellow('2. Reduce Output Token Usage'));
        console.log(chalk.dim('   These projects generate high output:'));
        highOutputProjects.forEach((proj) => {
          const name = proj.project_path.split('/').pop();
          const ratio = (proj.output_tokens / proj.input_tokens).toFixed(1);
          console.log(
            chalk.dim(`     • ${name} (${ratio}:1 output/input ratio, $${proj.total_cost.toFixed(2)})`)
          );
        });
        console.log(chalk.dim('   → Use more focused prompts or request concise responses\n'));
      }

      // Projects with high cost per prompt
      const expensiveProjects = db
        .prepare(
          `
        SELECT
          project_path,
          total_prompts,
          total_cost,
          (total_cost * 1.0 / total_prompts) as cost_per_prompt
        FROM projects
        WHERE total_prompts > 0
          AND (total_cost * 1.0 / total_prompts) > 0.20
        ORDER BY cost_per_prompt DESC
        LIMIT 3
      `
        )
        .all() as any[];

      if (expensiveProjects.length > 0) {
        console.log(chalk.yellow('3. Optimize Expensive Projects'));
        console.log(chalk.dim('   These projects have high cost per prompt (>$0.20):'));
        expensiveProjects.forEach((proj: any) => {
          const name = proj.project_path.split('/').pop();
          console.log(
            chalk.dim(`     • ${name} ($${proj.cost_per_prompt.toFixed(4)} per prompt, ${proj.total_prompts} prompts)`)
          );
        });
        console.log(chalk.dim('   → Break complex tasks into smaller prompts'));
        console.log(chalk.dim('   → Review if Opus is needed or if Sonnet/Haiku suffices\n'));
      }

      // General tips
      console.log(chalk.bold('💡 General Tips:\n'));
      console.log(chalk.dim('  • Use CLAUDE.md for project context to enable prompt caching'));
      console.log(chalk.dim('  • Structure prompts consistently to maximize cache hits'));
      console.log(chalk.dim('  • Use Haiku for simple tasks, Sonnet for most work, Opus for complex reasoning'));
      console.log(chalk.dim('  • Break large tasks into focused smaller prompts'));
      console.log(chalk.dim('  • Request concise responses when detailed output isn\'t needed'));

    } catch (error) {
      console.error(chalk.red('✗ Failed to generate optimization suggestions:'), error);
      process.exit(1);
    } finally {
      closeDatabase(db);
    }
  });

/**
 * Heatmap command - show session activity heatmap
 */
program
  .command('heatmap')
  .description('Show activity heatmap (when you code most)')
  .option('-d, --days <number>', 'Number of days to include', '30')
  .action((options) => {
    console.log(chalk.cyan.bold('Claude Analytics - Activity Heatmap\n'));

    const db = getDatabase();
    try {
      const daysBack = parseInt(options.days);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get hourly breakdown
      const hourlyStats = db
        .prepare(
          `
        SELECT
          strftime('%H', start_time) as hour,
          COUNT(*) as session_count,
          SUM(prompt_count) as total_prompts
        FROM sessions
        WHERE start_time >= ?
        GROUP BY hour
        ORDER BY hour ASC
      `
        )
        .all(startDate.toISOString()) as any[];

      // Get daily breakdown
      const dailyStats = db
        .prepare(
          `
        SELECT
          strftime('%w', start_time) as day_of_week,
          COUNT(*) as session_count,
          SUM(prompt_count) as total_prompts
        FROM sessions
        WHERE start_time >= ?
        GROUP BY day_of_week
        ORDER BY day_of_week ASC
      `
        )
        .all(startDate.toISOString()) as any[];

      console.log(chalk.bold(`Activity Over Last ${daysBack} Days:\n`));

      // Create hourly heatmap
      console.log(chalk.bold('⏰ Hourly Distribution:'));
      console.log(chalk.dim('   Time of day when you\'re most active\n'));

      const maxHourlyPrompts = Math.max(...hourlyStats.map((h: any) => h.total_prompts || 0));

      for (let hour = 0; hour < 24; hour++) {
        const hourStr = hour.toString().padStart(2, '0');
        const stat = hourlyStats.find((h: any) => parseInt(h.hour) === hour);
        const prompts = stat?.total_prompts || 0;
        const sessions = stat?.session_count || 0;

        // Create bar visualization
        const barLength = Math.round((prompts / maxHourlyPrompts) * 20);
        const bar = '█'.repeat(barLength);
        const barColor = prompts > maxHourlyPrompts * 0.7 ? chalk.green :
                         prompts > maxHourlyPrompts * 0.3 ? chalk.yellow :
                         chalk.dim;

        const label = `  ${hourStr}:00`;
        const stats = prompts > 0 ? ` ${prompts} prompts, ${sessions} sessions` : '';

        console.log(`${label} ${barColor(bar)}${chalk.dim(stats)}`);
      }

      // Create day of week distribution
      console.log(chalk.bold('\n📅 Day of Week Distribution:\n'));

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const maxDailyPrompts = Math.max(...dailyStats.map((d: any) => d.total_prompts || 0));

      for (let day = 0; day < 7; day++) {
        const stat = dailyStats.find((d: any) => parseInt(d.day_of_week) === day);
        const prompts = stat?.total_prompts || 0;
        const sessions = stat?.session_count || 0;

        const barLength = Math.round((prompts / maxDailyPrompts) * 30);
        const bar = '█'.repeat(barLength);
        const barColor = prompts > maxDailyPrompts * 0.7 ? chalk.green :
                         prompts > maxDailyPrompts * 0.3 ? chalk.yellow :
                         chalk.dim;

        const label = `  ${dayNames[day]}`;
        const stats = prompts > 0 ? ` ${prompts} prompts, ${sessions} sessions` : '';

        console.log(`${label.padEnd(6)} ${barColor(bar)}${chalk.dim(stats)}`);
      }

      // Find peak productivity times
      console.log(chalk.bold('\n🎯 Peak Productivity:\n'));

      const topHours = [...hourlyStats]
        .sort((a, b) => b.total_prompts - a.total_prompts)
        .slice(0, 3);

      if (topHours.length > 0) {
        console.log(chalk.yellow('  Most active hours:'));
        topHours.forEach((h, i) => {
          const hour = parseInt(h.hour);
          const timeLabel = `${hour.toString().padStart(2, '0')}:00-${((hour + 1) % 24).toString().padStart(2, '0')}:00`;
          console.log(chalk.dim(`    ${i + 1}. ${timeLabel} - ${h.total_prompts} prompts`));
        });
      }

      const topDays = [...dailyStats]
        .sort((a, b) => b.total_prompts - a.total_prompts)
        .slice(0, 2);

      if (topDays.length > 0) {
        console.log(chalk.yellow('\n  Most active days:'));
        topDays.forEach((d, i) => {
          const dayName = dayNames[parseInt(d.day_of_week)];
          console.log(chalk.dim(`    ${i + 1}. ${dayName} - ${d.total_prompts} prompts`));
        });
      }

      // Activity streak
      const recentDays = db
        .prepare(
          `
        SELECT
          DATE(start_time) as date,
          COUNT(*) as session_count
        FROM sessions
        WHERE start_time >= ?
        GROUP BY DATE(start_time)
        ORDER BY date DESC
      `
        )
        .all(startDate.toISOString()) as any[];

      // Calculate current streak
      let currentStreak = 0;
      const today = format(new Date(), 'yyyy-MM-dd');

      for (const day of recentDays) {
        const dayDate = day.date;
        const expectedDate = format(
          new Date(new Date().setDate(new Date().getDate() - currentStreak)),
          'yyyy-MM-dd'
        );

        if (dayDate === expectedDate) {
          currentStreak++;
        } else {
          break;
        }
      }

      if (currentStreak > 0) {
        console.log(chalk.bold('\n🔥 Current Streak:\n'));
        console.log(`  ${chalk.yellow(currentStreak)} ${currentStreak === 1 ? 'day' : 'days'} with activity`);
      }

    } catch (error) {
      console.error(chalk.red('✗ Failed to generate heatmap:'), error);
      process.exit(1);
    } finally {
      closeDatabase(db);
    }
  });

/**
 * Export command - export data to CSV or JSON
 */
program
  .command('export')
  .description('Export data to CSV or JSON format')
  .argument('<type>', 'Data to export: sessions, projects, prompts, daily')
  .option('-f, --format <format>', 'Export format: csv or json', 'csv')
  .option('-o, --output <file>', 'Output file path')
  .option('--days <number>', 'Limit to last N days', '30')
  .action((type, options) => {
    console.log(chalk.cyan.bold(`Claude Analytics - Export ${type}\n`));

    const db = getDatabase();
    try {
      const exportFormat = options.format.toLowerCase();
      const daysBack = parseInt(options.days);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      let data: any[] = [];
      let defaultFilename = `claude-${type}-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;

      switch (type) {
        case 'sessions':
          data = db
            .prepare(
              `
            SELECT
              session_id,
              project,
              start_time,
              end_time,
              prompt_count,
              duration_ms,
              first_prompt,
              last_prompt
            FROM sessions
            WHERE start_time >= ?
            ORDER BY start_time DESC
          `
            )
            .all(startDate.toISOString()) as any[];
          break;

        case 'projects':
          data = db
            .prepare(
              `
            SELECT
              project_path,
              first_seen,
              last_active,
              total_prompts,
              total_sessions,
              total_duration_ms,
              lines_added,
              lines_removed,
              total_cost,
              input_tokens,
              output_tokens,
              cache_creation_tokens,
              cache_read_tokens
            FROM projects
            ORDER BY total_cost DESC
          `
            )
            .all() as any[];
          break;

        case 'prompts':
          data = db
            .prepare(
              `
            SELECT
              id,
              session_id,
              project,
              display,
              timestamp,
              pasted_contents_count
            FROM prompts
            WHERE timestamp >= ?
            ORDER BY timestamp DESC
            LIMIT 1000
          `
            )
            .all(startDate.toISOString()) as any[];
          break;

        case 'daily':
          // Generate daily stats
          const dailyData = db
            .prepare(
              `
            SELECT
              DATE(start_time) as date,
              COUNT(*) as session_count,
              SUM(prompt_count) as total_prompts,
              SUM(duration_ms) as total_duration_ms,
              COUNT(DISTINCT project) as unique_projects
            FROM sessions
            WHERE start_time >= ?
            GROUP BY DATE(start_time)
            ORDER BY date DESC
          `
            )
            .all(startDate.toISOString()) as any[];

          data = dailyData;
          break;

        default:
          console.error(chalk.red('✗ Invalid type. Choose: sessions, projects, prompts, or daily'));
          process.exit(1);
      }

      const outputFile = options.output || defaultFilename;

      if (exportFormat === 'json') {
        // Export as JSON
        const json = JSON.stringify(data, null, 2);
        writeFileSync(outputFile, json, 'utf-8');
        console.log(chalk.green(`✓ Exported ${data.length} records to ${outputFile}`));
      } else if (exportFormat === 'csv') {
        // Export as CSV
        if (data.length === 0) {
          console.log(chalk.yellow('No data to export'));
          return;
        }

        // Get headers from first object
        const headers = Object.keys(data[0]);
        const csvLines = [headers.join(',')];

        // Add data rows
        for (const row of data) {
          const values = headers.map((header) => {
            let value = row[header];
            // Escape quotes and wrap in quotes if contains comma or quote
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              value = `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          });
          csvLines.push(values.join(','));
        }

        const csv = csvLines.join('\n');
        writeFileSync(outputFile, csv, 'utf-8');
        console.log(chalk.green(`✓ Exported ${data.length} records to ${outputFile}`));
      } else {
        console.error(chalk.red('✗ Invalid format. Choose: csv or json'));
        process.exit(1);
      }

      console.log(chalk.dim(`\nFile saved to: ${outputFile}`));
      console.log(chalk.dim('You can now analyze this data in spreadsheet software or other tools'));
    } catch (error) {
      console.error(chalk.red('✗ Export failed:'), error);
      process.exit(1);
    } finally {
      closeDatabase(db);
    }
  });

/**
 * Habits command - analyze productivity habits and patterns
 */
program
  .command('habits')
  .description('Analyze your productivity habits and patterns')
  .action(() => {
    console.log(chalk.cyan.bold('Claude Analytics - Habit Analysis\n'));

    const db = getDatabase();
    try {
      // Detect all patterns
      const patterns = detectAllPatterns(db);
      const efficiency = analyzeContextEfficiency(db);
      const recommendations = generateRecommendations(db);
      const skillRecs = getSkillRecommendations(db);

      // Display streak
      console.log(chalk.bold('🔥 Productivity Streak:\n'));
      if (patterns.streak.current > 0) {
        console.log(`  Current: ${chalk.yellow(patterns.streak.current)} ${patterns.streak.current === 1 ? 'day' : 'days'}`);
        console.log(`  Longest: ${chalk.yellow(patterns.streak.longest)} ${patterns.streak.longest === 1 ? 'day' : 'days'}`);
        if (patterns.streak.lastActive) {
          console.log(`  Last active: ${chalk.dim(format(patterns.streak.lastActive, 'MMM d, yyyy'))}`);
        }
      } else {
        console.log(chalk.dim('  No recent activity'));
      }
      console.log();

      // Display time patterns
      if (patterns.timePatterns.length > 0) {
        console.log(chalk.bold('⏰ Time-of-Day Patterns:\n'));
        patterns.timePatterns.slice(0, 3).forEach((pattern, i) => {
          const confidence = pattern.confidence >= 80 ? chalk.green : pattern.confidence >= 60 ? chalk.yellow : chalk.dim;
          console.log(chalk.cyan(`  ${i + 1}. ${pattern.name}`));
          console.log(`     ${pattern.description}`);
          console.log(`     Confidence: ${confidence(pattern.confidence.toFixed(0) + '%')} • ${pattern.frequency} sessions\n`);
        });
      }

      // Display day patterns
      if (patterns.dayPatterns.length > 0) {
        console.log(chalk.bold('📅 Day-of-Week Patterns:\n'));
        patterns.dayPatterns.forEach((pattern, i) => {
          const confidence = pattern.confidence >= 80 ? chalk.green : pattern.confidence >= 60 ? chalk.yellow : chalk.dim;
          console.log(chalk.cyan(`  ${i + 1}. ${pattern.name}`));
          console.log(`     ${pattern.description}`);
          console.log(`     Confidence: ${confidence(pattern.confidence.toFixed(0) + '%')} • ${pattern.frequency} sessions\n`);
        });
      }

      // Display focus patterns
      if (patterns.focusPatterns.length > 0) {
        console.log(chalk.bold('🎯 Focus Patterns:\n'));
        patterns.focusPatterns.slice(0, 2).forEach((pattern, i) => {
          const confidence = pattern.confidence >= 80 ? chalk.green : pattern.confidence >= 60 ? chalk.yellow : chalk.dim;
          console.log(chalk.cyan(`  ${i + 1}. ${pattern.name}`));
          console.log(`     ${pattern.description}`);
          console.log(`     Confidence: ${confidence(pattern.confidence.toFixed(0) + '%')}\n`);
        });
      }

      // Display context efficiency
      console.log(chalk.bold('💾 Context Efficiency:\n'));
      const efficiencyColor =
        efficiency.efficiency === 'excellent' ? chalk.green :
        efficiency.efficiency === 'good' ? chalk.yellow :
        efficiency.efficiency === 'fair' ? chalk.yellow :
        chalk.red;

      console.log(`  Overall: ${efficiencyColor(efficiency.efficiency.toUpperCase())}`);
      console.log(`  Cache hit ratio: ${chalk.yellow(efficiency.cacheHitRatio + '%')}`);
      console.log(`  Avg prompts/session: ${chalk.yellow(efficiency.averagePromptsPerSession)}`);
      console.log(`  Avg session length: ${chalk.yellow(efficiency.averageSessionLength.toFixed(1) + ' min')}`);
      console.log(`  Context resets: ${chalk.yellow(efficiency.contextResets)}\n`);

      if (efficiency.recommendations.length > 0) {
        console.log(chalk.bold('  Recommendations:'));
        efficiency.recommendations.forEach((rec) => {
          console.log(chalk.dim(`    • ${rec}`));
        });
        console.log();
      }

      // Display top recommendations
      if (recommendations.length > 0) {
        console.log(chalk.bold('💡 Top Recommendations:\n'));
        recommendations.slice(0, 3).forEach((rec, i) => {
          const priorityColor = rec.priority === 'high' ? chalk.red : rec.priority === 'medium' ? chalk.yellow : chalk.dim;
          console.log(chalk.cyan(`  ${i + 1}. ${rec.title}`) + ` ${priorityColor(`[${rec.priority}]`)}`);
          console.log(`     ${rec.description}`);
          console.log(chalk.green(`     Impact: ${rec.impact}`));
          if (rec.actionItems.length > 0) {
            console.log(chalk.bold('     Action items:'));
            rec.actionItems.forEach((action) => {
              console.log(chalk.dim(`       • ${action}`));
            });
          }
          console.log();
        });
      }

      // Display skill recommendations
      if (skillRecs.length > 0) {
        console.log(chalk.bold('🚀 Skill Development:\n'));
        skillRecs.forEach((skill) => {
          const levelColor =
            skill.currentLevel === 'advanced' ? chalk.green :
            skill.currentLevel === 'intermediate' ? chalk.yellow :
            chalk.dim;

          console.log(chalk.cyan(`  ${skill.skill}`) + ` • ${levelColor(skill.currentLevel)}`);
          if (skill.nextSteps.length > 0) {
            console.log(chalk.bold('  Next steps:'));
            skill.nextSteps.forEach((step) => {
              console.log(chalk.dim(`    • ${step}`));
            });
          }
          console.log();
        });
      }

      // Display context optimization opportunities
      const opportunities = getContextOptimizationOpportunities(db);
      if (opportunities.length > 0) {
        console.log(chalk.bold('💰 Cost Optimization Opportunities:\n'));
        opportunities.slice(0, 3).forEach((opp, i) => {
          const projectName = opp.project.split('/').pop();
          console.log(chalk.cyan(`  ${i + 1}. ${projectName}`));
          console.log(`     Issue: ${opp.issue}`);
          console.log(`     Recommendation: ${opp.recommendation}`);
          console.log(chalk.green(`     Potential savings: ${opp.potentialSavings}\n`));
        });
      }

    } catch (error) {
      console.error(chalk.red('✗ Failed to analyze habits:'), error);
      process.exit(1);
    } finally {
      closeDatabase(db);
    }
  });

/**
 * Skills command - analyze skill proficiency and learning paths
 */
program
  .command('skills')
  .description('Analyze your skill proficiency and track learning progress')
  .option('-s, --skill <name>', 'Show detailed progress for a specific skill')
  .option('-c, --category <category>', 'Filter by category (framework, language, tool, platform, concept)')
  .option('-l, --limit <number>', 'Limit number of skills shown', '20')
  .action((options) => {
    console.log(chalk.cyan.bold('Claude Analytics - Skill Proficiency\n'));

    const db = getDatabase();
    try {
      const proficiencies = analyzeSkillProficiency(db);

      if (proficiencies.length === 0) {
        console.log(chalk.yellow('No skills detected yet. Start working on projects to track your skill progression!'));
        return;
      }

      // Show specific skill details
      if (options.skill) {
        const skill = proficiencies.find(
          (s) => s.skill.toLowerCase() === options.skill.toLowerCase()
        );

        if (!skill) {
          console.log(chalk.red(`Skill "${options.skill}" not found.`));
          console.log(chalk.gray('\nAvailable skills:'));
          proficiencies.slice(0, 10).forEach((s) => {
            console.log(chalk.gray(`  - ${s.skill}`));
          });
          return;
        }

        console.log(chalk.bold(`📚 ${skill.skill}\n`));
        console.log(`  Category: ${chalk.cyan(skill.category)}`);
        console.log(`  Level: ${chalk.yellow(skill.level.toUpperCase())}`);
        console.log(`  Proficiency: ${chalk.green(skill.proficiency + '%')}`);
        console.log(`  Usage: ${skill.usageCount} sessions`);
        console.log(`  First used: ${format(skill.firstUsed, 'MMM d, yyyy')}`);
        console.log(`  Last used: ${format(skill.lastUsed, 'MMM d, yyyy')}`);
        console.log(`  Experience: ${skill.daysSinceFirstUse} days`);
        console.log(`  Consistency: ${skill.consistency}%`);
        console.log(`  Depth: ${skill.depth}%`);

        if (skill.relatedSkills.length > 0) {
          console.log(chalk.bold('\n  Related Skills:'));
          skill.relatedSkills.forEach((s) => {
            console.log(chalk.gray(`    - ${s}`));
          });
        }

        console.log(chalk.bold('\n  Next Milestone:'));
        console.log(chalk.green(`    ${skill.nextMilestone}`));

        // Show progress over time
        const progress = getSkillProgress(db, skill.skill);
        if (progress.length > 0) {
          console.log(chalk.bold('\n  Progress Over Time:\n'));
          progress.slice(-6).forEach((p) => {
            const bar = '█'.repeat(Math.floor(p.sessions / 2));
            console.log(`    ${p.month}: ${chalk.cyan(bar)} ${p.sessions} sessions (avg ${p.avgDepth} prompts)`);
          });
        }

        return;
      }

      // Filter by category if specified
      let filteredSkills = proficiencies;
      if (options.category) {
        filteredSkills = proficiencies.filter(
          (s) => s.category.toLowerCase() === options.category.toLowerCase()
        );

        if (filteredSkills.length === 0) {
          console.log(chalk.red(`No skills found in category "${options.category}"`));
          console.log(chalk.gray('\nAvailable categories: framework, language, tool, platform, concept'));
          return;
        }
      }

      // Show skill comparison
      const comparison = compareSkills(proficiencies);

      if (comparison.strongest.length > 0) {
        console.log(chalk.bold('💪 Strongest Skills:\n'));
        comparison.strongest.forEach((skill, i) => {
          const levelColor =
            skill.level === 'expert'
              ? chalk.magenta
              : skill.level === 'advanced'
              ? chalk.green
              : chalk.yellow;

          console.log(
            `  ${i + 1}. ${chalk.cyan(skill.skill)} - ${levelColor(skill.level.toUpperCase())} ${chalk.gray(
              `(${skill.proficiency}%)`
            )}`
          );
          console.log(
            `     ${skill.usageCount} sessions, ${skill.daysSinceFirstUse} days experience`
          );
          console.log(chalk.gray(`     ${skill.nextMilestone}\n`));
        });
      }

      if (comparison.emerging.length > 0) {
        console.log(chalk.bold('🌱 Emerging Skills:\n'));
        comparison.emerging.forEach((skill, i) => {
          console.log(
            `  ${i + 1}. ${chalk.green(skill.skill)} - ${chalk.yellow(skill.level.toUpperCase())} ${chalk.gray(
              `(${skill.proficiency}%)`
            )}`
          );
          console.log(`     Recently started, ${skill.usageCount} sessions so far`);
          console.log(chalk.gray(`     ${skill.nextMilestone}\n`));
        });
      }

      if (comparison.needsPractice.length > 0) {
        console.log(chalk.bold('⚠️  Skills Needing Practice:\n'));
        comparison.needsPractice.forEach((skill, i) => {
          const daysSinceUse = Math.floor(
            (new Date().getTime() - skill.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
          );
          console.log(
            `  ${i + 1}. ${chalk.gray(skill.skill)} - ${chalk.dim(skill.level.toUpperCase())} ${chalk.gray(
              `(${skill.proficiency}%)`
            )}`
          );
          console.log(
            chalk.gray(`     Last used ${daysSinceUse} days ago, consistency: ${skill.consistency}%\n`)
          );
        });
      }

      // Show all skills table
      const limit = parseInt(options.limit);
      console.log(chalk.bold(`\n📊 All Skills (top ${Math.min(limit, filteredSkills.length)}):\n`));

      console.log(
        chalk.gray(
          '  ' +
            'Skill'.padEnd(20) +
            'Category'.padEnd(12) +
            'Level'.padEnd(15) +
            'Score'.padEnd(8) +
            'Sessions'.padEnd(10)
        )
      );
      console.log(chalk.gray('  ' + '-'.repeat(75)));

      filteredSkills.slice(0, limit).forEach((skill) => {
        const levelColor =
          skill.level === 'expert'
            ? chalk.magenta
            : skill.level === 'advanced'
            ? chalk.green
            : skill.level === 'intermediate'
            ? chalk.yellow
            : chalk.gray;

        console.log(
          '  ' +
            chalk.cyan(skill.skill.padEnd(20)) +
            chalk.dim(skill.category.padEnd(12)) +
            levelColor(skill.level.padEnd(15)) +
            chalk.green((skill.proficiency + '%').padEnd(8)) +
            skill.usageCount.toString().padEnd(10)
        );
      });

      console.log(chalk.gray('\n  Use --skill <name> to see detailed progress for a specific skill'));
      console.log(chalk.gray('  Use --category <category> to filter by category'));
    } catch (error) {
      console.error(chalk.red('✗ Failed to analyze skills:'), error);
      process.exit(1);
    } finally {
      closeDatabase(db);
    }
  });

program.parse();
