/**
 * Notification System
 *
 * Sends notifications to Slack, Discord, or other platforms
 */

import type { Achievement } from './achievements.js';

export interface NotificationConfig {
  enabled: boolean;
  platform: 'slack' | 'discord' | 'webhook';
  webhookUrl: string;
  notifyOn: {
    achievements: boolean;
    streaks: boolean;
    milestones: boolean;
    weeklyReport: boolean;
  };
}

/**
 * Send Slack notification
 */
export async function sendSlackNotification(
  webhookUrl: string,
  message: string,
  achievements?: Achievement[]
): Promise<boolean> {
  try {
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎉 Claude Analytics',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message,
        },
      },
    ];

    if (achievements && achievements.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*New Achievements:*',
        },
      });

      for (const achievement of achievements) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${achievement.icon} *${achievement.title}*\n${achievement.description}`,
          },
        });
      }
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blocks,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    return false;
  }
}

/**
 * Send Discord notification
 */
export async function sendDiscordNotification(
  webhookUrl: string,
  message: string,
  achievements?: Achievement[]
): Promise<boolean> {
  try {
    const embeds: any[] = [
      {
        title: '🎉 Claude Analytics',
        description: message,
        color: 0x5865f2, // Discord blurple
        timestamp: new Date().toISOString(),
      },
    ];

    if (achievements && achievements.length > 0) {
      const fields = achievements.map((achievement) => ({
        name: `${achievement.icon} ${achievement.title}`,
        value: achievement.description,
        inline: false,
      }));

      embeds[0].fields = fields;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Claude Analytics',
        embeds,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
    return false;
  }
}

/**
 * Send generic webhook notification
 */
export async function sendWebhookNotification(
  webhookUrl: string,
  data: {
    message: string;
    achievements?: Achievement[];
    timestamp: string;
  }
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send webhook notification:', error);
    return false;
  }
}

/**
 * Send notification based on config
 */
export async function sendNotification(
  config: NotificationConfig,
  message: string,
  achievements?: Achievement[]
): Promise<boolean> {
  if (!config.enabled) {
    return false;
  }

  switch (config.platform) {
    case 'slack':
      return sendSlackNotification(config.webhookUrl, message, achievements);
    case 'discord':
      return sendDiscordNotification(config.webhookUrl, message, achievements);
    case 'webhook':
      return sendWebhookNotification(config.webhookUrl, {
        message,
        achievements,
        timestamp: new Date().toISOString(),
      });
    default:
      return false;
  }
}

/**
 * Load notification config from environment or config file
 */
export function loadNotificationConfig(): NotificationConfig | null {
  const webhookUrl = process.env.ANALYTICS_WEBHOOK_URL;
  const platform = (process.env.ANALYTICS_PLATFORM as any) || 'slack';

  if (!webhookUrl) {
    return null;
  }

  return {
    enabled: true,
    platform,
    webhookUrl,
    notifyOn: {
      achievements: process.env.ANALYTICS_NOTIFY_ACHIEVEMENTS !== 'false',
      streaks: process.env.ANALYTICS_NOTIFY_STREAKS !== 'false',
      milestones: process.env.ANALYTICS_NOTIFY_MILESTONES !== 'false',
      weeklyReport: process.env.ANALYTICS_NOTIFY_WEEKLY === 'true',
    },
  };
}

/**
 * Format achievement notification message
 */
export function formatAchievementMessage(achievements: Achievement[]): string {
  if (achievements.length === 0) {
    return 'No new achievements.';
  }

  if (achievements.length === 1) {
    return `You unlocked a new achievement: *${achievements[0].title}*!`;
  }

  return `You unlocked ${achievements.length} new achievements!`;
}

/**
 * Format weekly report message
 */
export function formatWeeklyReport(stats: {
  sessions: number;
  prompts: number;
  projects: number;
  totalTime: string;
}): string {
  return `📊 *Weekly Report*\n\n` +
    `• Sessions: ${stats.sessions}\n` +
    `• Prompts: ${stats.prompts}\n` +
    `• Projects: ${stats.projects}\n` +
    `• Total time: ${stats.totalTime}`;
}

/**
 * Format streak notification message
 */
export function formatStreakMessage(streakDays: number): string {
  if (streakDays === 1) {
    return '🔥 New streak started! Keep it going!';
  }

  if (streakDays % 7 === 0) {
    return `🔥 *${streakDays}-day streak!* You're on fire!`;
  }

  if (streakDays >= 30) {
    return `🔥 *${streakDays}-day streak!* Incredible consistency!`;
  }

  return `🔥 ${streakDays}-day streak! Keep coding!`;
}
