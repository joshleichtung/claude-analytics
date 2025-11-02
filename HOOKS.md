# Hook Integration

Claude Analytics includes a post-session hook that automatically syncs data and detects achievements after each coding session.

## Installation

### 1. Build the Hook

```bash
cd ~/projects/claude-analytics
npm run build
```

### 2. Create Hook Script

Create a shell script wrapper for the hook:

```bash
cat > ~/.claude/hooks/analytics-post-session.sh <<'EOF'
#!/bin/bash
# Claude Analytics Post-Session Hook
# Automatically syncs analytics and checks for achievements

# Run the post-session hook
node ~/projects/claude-analytics/dist/hooks/post-session.js
EOF

chmod +x ~/.claude/hooks/analytics-post-session.sh
```

### 3. Configure Claude Code Hook

Add the hook to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "hooks": {
    "user-prompt-submit": {
      "command": "~/.claude/hooks/analytics-post-session.sh",
      "requireApproval": false,
      "timeout": 5000
    }
  }
}
```

Alternatively, use the `exit-task` hook to trigger after completing tasks:

```json
{
  "hooks": {
    "exit-task": {
      "command": "~/.claude/hooks/analytics-post-session.sh",
      "requireApproval": false,
      "timeout": 5000
    }
  }
}
```

## Features

The post-session hook automatically:

- ✅ Syncs new prompts and sessions to the analytics database
- 🎉 Detects and unlocks new achievements
- 📊 Updates project statistics
- 🔔 Sends notifications (if configured)

## Achievement Notifications

When you unlock achievements, you'll see them displayed in your terminal:

```
🎉 New Achievements Unlocked!

🔥 3-Day Streak: Maintained a 3-day coding streak!
📚 Next.js Advanced: Reached advanced level in Next.js!
```

## Notification Configuration

### Slack Notifications

Set environment variables to enable Slack notifications:

```bash
export ANALYTICS_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
export ANALYTICS_PLATFORM="slack"
export ANALYTICS_NOTIFY_ACHIEVEMENTS="true"
export ANALYTICS_NOTIFY_STREAKS="true"
```

### Discord Notifications

```bash
export ANALYTICS_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR/WEBHOOK/URL"
export ANALYTICS_PLATFORM="discord"
export ANALYTICS_NOTIFY_ACHIEVEMENTS="true"
```

### Generic Webhook

```bash
export ANALYTICS_WEBHOOK_URL="https://your-webhook.com/endpoint"
export ANALYTICS_PLATFORM="webhook"
export ANALYTICS_NOTIFY_ACHIEVEMENTS="true"
```

Add these to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.) to make them permanent.

## Debugging

Enable debug output to see hook activity:

```bash
export DEBUG="true"
```

This will show sync statistics and any errors in the terminal.

## Manual Achievement Check

You can manually check for achievements without the hook:

```bash
claude-stats achievements --unlock
```

View all unlocked achievements:

```bash
claude-stats achievements
```

Check progress toward locked achievements:

```bash
claude-stats achievements --check
```

## Disabling the Hook

To temporarily disable, remove the hook from `settings.json` or set `requireApproval: true`.

To permanently disable, delete the hook script:

```bash
rm ~/.claude/hooks/analytics-post-session.sh
```
