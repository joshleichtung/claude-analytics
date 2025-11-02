#!/usr/bin/env node

/**
 * Web Dashboard Server
 *
 * Simple Express server that serves analytics data for web visualization
 */

import express from 'express';
import { getDatabase } from '../database/db.js';
import { analyzeSkillProficiency } from '../utils/skill-proficiency.js';
import { getUnlockedAchievements } from '../utils/achievements.js';
import { detectAllPatterns } from '../utils/habit-detector.js';
import { analyzeContextEfficiency } from '../utils/context-efficiency.js';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

const app = express();
const port = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

/**
 * API: Get overview stats
 */
app.get('/api/overview', (req, res) => {
  const db = getDatabase();

  try {
    const stats = db
      .prepare(
        `
      SELECT
        COUNT(*) as total_sessions,
        SUM(prompt_count) as total_prompts,
        COUNT(DISTINCT project) as total_projects,
        SUM(duration_ms) / 1000.0 / 3600.0 as total_hours
      FROM sessions
    `
      )
      .get() as any;

    const thisWeek = db
      .prepare(
        `
      SELECT
        COUNT(*) as sessions,
        SUM(prompt_count) as prompts
      FROM sessions
      WHERE start_time >= datetime('now', '-7 days')
    `
      )
      .get() as any;

    res.json({
      totalSessions: stats.total_sessions || 0,
      totalPrompts: stats.total_prompts || 0,
      totalProjects: stats.total_projects || 0,
      totalHours: Math.round((stats.total_hours || 0) * 10) / 10,
      thisWeek: {
        sessions: thisWeek.sessions || 0,
        prompts: thisWeek.prompts || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

/**
 * API: Get achievements
 */
app.get('/api/achievements', (req, res) => {
  const db = getDatabase();

  try {
    const achievements = getUnlockedAchievements(db);
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * API: Get skills
 */
app.get('/api/skills', (req, res) => {
  const db = getDatabase();

  try {
    const skills = analyzeSkillProficiency(db);
    res.json(skills);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

/**
 * API: Get habits
 */
app.get('/api/habits', (req, res) => {
  const db = getDatabase();

  try {
    const patterns = detectAllPatterns(db);
    const efficiency = analyzeContextEfficiency(db);

    res.json({
      patterns,
      efficiency,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
});

/**
 * API: Get activity heatmap
 */
app.get('/api/activity', (req, res) => {
  const db = getDatabase();

  try {
    // Get last 30 days of activity
    const days = parseInt((req.query.days as string) || '30');

    const activity = db
      .prepare(
        `
      SELECT
        DATE(start_time) as date,
        COUNT(*) as sessions,
        SUM(prompt_count) as prompts
      FROM sessions
      WHERE start_time >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(start_time)
      ORDER BY date ASC
    `
      )
      .all(days) as any[];

    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

/**
 * API: Get top projects
 */
app.get('/api/projects', (req, res) => {
  const db = getDatabase();

  try {
    const limit = parseInt((req.query.limit as string) || '10');

    const projects = db
      .prepare(
        `
      SELECT
        project,
        total_cost,
        total_prompts,
        total_sessions,
        input_tokens,
        output_tokens,
        cache_read_tokens,
        cache_creation_tokens
      FROM projects
      ORDER BY total_cost DESC
      LIMIT ?
    `
      )
      .all(limit) as any[];

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`📊 Claude Analytics Dashboard`);
  console.log(`🌐 Server running at http://localhost:${port}`);
  console.log(`\n📈 Available endpoints:`);
  console.log(`   GET /api/overview     - Overall statistics`);
  console.log(`   GET /api/achievements - Unlocked achievements`);
  console.log(`   GET /api/skills       - Skill proficiency`);
  console.log(`   GET /api/habits       - Habit patterns`);
  console.log(`   GET /api/activity     - Activity heatmap`);
  console.log(`   GET /api/projects     - Top projects`);
  console.log(`\nPress Ctrl+C to stop`);
});
