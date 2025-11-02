#!/usr/bin/env node

/**
 * Post-Session Hook
 *
 * Automatically syncs analytics data and checks for achievements after each session
 * This hook is designed to be triggered by Claude Code's hook system
 */

import { getDatabase, closeDatabase } from '../database/db.js';
import { syncData } from '../utils/sync.js';
import { getNewAchievements, saveAchievement } from '../utils/achievements.js';
import {
  loadNotificationConfig,
  sendNotification,
  formatAchievementMessage,
} from '../utils/notifications.js';
import chalk from 'chalk';

async function main() {
  const db = getDatabase();

  try {
    // Auto-sync data
    const result = syncData(db);

    // Check for new achievements
    const newAchievements = getNewAchievements(db);

    if (newAchievements.length > 0) {
      console.log(chalk.yellow('\n🎉 New Achievements Unlocked!\n'));

      for (const achievement of newAchievements) {
        console.log(
          chalk.green(
            `${achievement.icon} ${chalk.bold(achievement.title)}: ${achievement.description}`
          )
        );

        // Save achievement to database
        saveAchievement(db, achievement);
      }

      console.log('');

      // Send notification if configured
      const notificationConfig = loadNotificationConfig();
      if (notificationConfig && notificationConfig.notifyOn.achievements) {
        const message = formatAchievementMessage(newAchievements);
        await sendNotification(notificationConfig, message, newAchievements);
      }
    }

    // Output sync stats (for debugging)
    if (process.env.DEBUG === 'true') {
      console.log(chalk.gray('[Analytics] Synced:'), {
        prompts: result.promptsProcessed,
        sessions: result.sessionsCreated,
        projects: result.projectsUpdated,
      });
    }
  } catch (error) {
    // Silent fail - don't interrupt user workflow
    if (process.env.DEBUG === 'true') {
      console.error(chalk.red('[Analytics] Hook error:'), error);
    }
  } finally {
    closeDatabase(db);
  }
}

main();
