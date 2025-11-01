/**
 * Type definitions for Claude Code analytics
 */

import { z } from 'zod';

/**
 * History entry from history.jsonl
 */
export const HistoryEntrySchema = z.object({
  display: z.string(),
  pastedContents: z.record(z.unknown()).optional(),
  timestamp: z.number(),
  project: z.string(),
  sessionId: z.string().optional(),
});

export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

/**
 * Project metrics from .claude.json
 */
export const ProjectMetricsSchema = z.object({
  allowedTools: z.array(z.string()).optional().default([]),
  mcpContextUris: z.array(z.string()).optional().default([]),
  mcpServers: z.record(z.unknown()).optional().default({}),
  enabledMcpjsonServers: z.array(z.string()).optional().default([]),
  disabledMcpjsonServers: z.array(z.string()).optional().default([]),
  hasTrustDialogAccepted: z.boolean().optional(),
  projectOnboardingSeenCount: z.number().optional().default(0),
  hasClaudeMdExternalIncludesApproved: z.boolean().optional(),
  hasClaudeMdExternalIncludesWarningShown: z.boolean().optional(),
  lastTotalWebSearchRequests: z.number().optional().default(0),
  lastCost: z.number().optional().default(0),
  lastAPIDuration: z.number().optional().default(0),
  lastDuration: z.number().optional().default(0),
  lastLinesAdded: z.number().optional().default(0),
  lastLinesRemoved: z.number().optional().default(0),
  lastTotalInputTokens: z.number().optional().default(0),
  lastTotalOutputTokens: z.number().optional().default(0),
  lastTotalCacheCreationInputTokens: z.number().optional().default(0),
  lastTotalCacheReadInputTokens: z.number().optional().default(0),
  lastSessionId: z.string().optional(),
});

export type ProjectMetrics = z.infer<typeof ProjectMetricsSchema>;

/**
 * Claude configuration with project metrics
 */
export const ClaudeConfigSchema = z.object({
  projects: z.record(ProjectMetricsSchema),
  // Other config fields we don't need for analytics
  autoUpdates: z.unknown().optional(),
  bypassPermissionsModeAccepted: z.unknown().optional(),
  cachedChangelog: z.unknown().optional(),
  cachedDynamicConfigs: z.unknown().optional(),
  cachedStatsigGates: z.unknown().optional(),
  changelogLastFetched: z.unknown().optional(),
  editorMode: z.unknown().optional(),
  fallbackAvailableWarningThreshold: z.unknown().optional(),
  feedbackSurveyState: z.unknown().optional(),
  firstStartTime: z.string().optional(),
  hasAvailableSubscription: z.unknown().optional(),
  hasCompletedOnboarding: z.unknown().optional(),
  hasOpusPlanDefault: z.unknown().optional(),
  hasSeenTasksHint: z.unknown().optional(),
  installMethod: z.unknown().optional(),
  isQualifiedForDataSharing: z.unknown().optional(),
  lastOnboardingVersion: z.unknown().optional(),
  lastPlanModeUse: z.unknown().optional(),
  lastReleaseNotesSeen: z.unknown().optional(),
});

export type ClaudeConfig = z.infer<typeof ClaudeConfigSchema>;

/**
 * Processed session data for analytics
 */
export interface Session {
  sessionId: string;
  project: string;
  startTime: Date;
  endTime: Date;
  promptCount: number;
  duration: number; // milliseconds
  firstPrompt: string;
  lastPrompt: string;
}

/**
 * Daily statistics
 */
export interface DailyStats {
  date: Date;
  totalPrompts: number;
  uniqueSessions: number;
  totalDuration: number;
  projectsWorked: string[];
  averageSessionLength: number;
}

/**
 * Project statistics
 */
export interface ProjectStats {
  projectPath: string;
  totalPrompts: number;
  totalSessions: number;
  totalDuration: number;
  lastActive: Date;
  linesAdded: number;
  linesRemoved: number;
  totalCost: number;
  totalTokens: {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
  };
}

/**
 * Habit pattern detection
 */
export interface HabitPattern {
  name: string;
  description: string;
  frequency: number;
  lastOccurrence: Date;
  confidence: number; // 0-1
}

/**
 * Skill progression tracking
 */
export interface SkillProgression {
  skill: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  usageCount: number;
  firstUsed: Date;
  lastUsed: Date;
  proficiency: number; // 0-100
}
