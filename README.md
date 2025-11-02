# Claude Analytics

Analytics and habit tracking for Claude Code usage. Track your sessions, prompts, costs, and skill progression over time.

## Features

- 📊 Session and prompt tracking
- 💰 Cost and token usage analytics
- 📈 Project-level statistics
- 📅 Daily/weekly/monthly reports
- 🔥 Activity heatmaps and export
- 🎯 Habit pattern detection
- 🚀 Skill progression tracking
- 💡 Personalized best practice recommendations

## Installation

```bash
cd ~/projects/claude-analytics
npm install
npm run build
```

### Link globally

```bash
npm link
```

Now you can use `claude-stats` from anywhere.

## Usage

### Sync Data

First, sync data from Claude Code's history:

```bash
claude-stats sync
```

This reads from:
- `~/.claude/history.jsonl` - All your prompts and sessions
- `~/.claude.json` - Project metrics (cost, tokens, lines changed)

### View Today's Stats

```bash
claude-stats today
```

Shows:
- Number of sessions and prompts
- Total time spent
- Projects worked on
- Top projects by time

### View This Week's Stats

```bash
claude-stats week
```

Shows:
- Weekly overview (sessions, prompts, time)
- Daily breakdown for each day
- Top projects this week

### View This Month's Stats

```bash
claude-stats month
```

Shows:
- Monthly overview with averages
- Weekly breakdown
- Top projects this month

### List Projects

```bash
claude-stats projects
```

Options:
- `-l, --limit <number>` - Limit results (default: 10)
- `-s, --sort <field>` - Sort by: prompts, cost, duration (default: duration)

```bash
# Show top 5 projects by cost
claude-stats projects -l 5 -s cost

# Show top 20 projects by prompt count
claude-stats projects -l 20 -s prompts
```

### Cost Breakdown

```bash
claude-stats cost
```

Shows:
- Total cost across all projects
- Cost per project with percentages
- Token breakdown (input, output, cache)
- Optimization tips for high-cost projects

Options:
- `-l, --limit <number>` - Limit results (default: 10)
- `--min <amount>` - Minimum cost to display (default: 0)

### Optimization Suggestions

```bash
claude-stats optimize
```

Analyzes your usage and provides:
- Overall token usage statistics
- Cache efficiency (hit ratio)
- Projects that could benefit from caching
- Projects with high output/input ratios
- Expensive projects (>$0.20 per prompt)
- General optimization tips

### Activity Heatmap

```bash
claude-stats heatmap
```

Visualizes when you're most productive:
- Hourly distribution (24-hour breakdown)
- Day of week distribution
- Peak productivity times
- Current activity streak

Options:
- `-d, --days <number>` - Number of days to analyze (default: 30)

### Export Data

```bash
claude-stats export <type>
```

Export data to CSV or JSON for external analysis:

```bash
# Export projects to CSV
claude-stats export projects -f csv -o my-projects.csv

# Export sessions to JSON
claude-stats export sessions -f json --days 7

# Export daily stats
claude-stats export daily -f csv --days 30

# Export prompts (limited to 1000 most recent)
claude-stats export prompts -f json
```

Types: `sessions`, `projects`, `prompts`, `daily`

Options:
- `-f, --format <format>` - Export format: csv or json (default: csv)
- `-o, --output <file>` - Output file path (auto-generated if omitted)
- `--days <number>` - Limit to last N days (default: 30)

### Analyze Habits

```bash
claude-stats habits
```

Comprehensive habit and productivity analysis:

**Productivity Patterns:**
- 🔥 Current and longest streaks
- ⏰ Time-of-day patterns (Morning Coder, Night Owl, etc.)
- 📅 Day-of-week patterns (Weekend Warrior, Weekday Grinder)
- 🎯 Focus patterns (Single Project Focus, Multi-Project Juggler)

**Context Efficiency:**
- Overall efficiency rating (excellent/good/fair/poor)
- Cache hit ratio analysis
- Session metrics (avg prompts, length, resets)
- Personalized recommendations

**Recommendations:**
- Top 3 actionable recommendations by priority
- Specific action items for improvement
- Impact estimates

**Skill Development:**
- Current skill level assessment
- Next steps for growth
- Mastery progression tracking

**Cost Optimization:**
- Projects that could benefit from caching
- Poor cache hit ratio identification
- Potential savings estimates

### Skill Proficiency

```bash
claude-stats skills
```

Track your skill development and proficiency across frameworks, languages, tools, and platforms.

**Overview Display:**
- 💪 **Strongest Skills**: Top 5 skills with proficiency ≥60% (expert/advanced level)
- 🌱 **Emerging Skills**: Top 3 intermediate-level skills started within 90 days
- ⚠️  **Skills Needing Practice**: Skills with low consistency (<50%) and >30 days since last use
- 📊 **All Skills Table**: Comprehensive view with skill/category/level/score/sessions

**Options:**
- `-s, --skill <name>` - Show detailed progress for a specific skill
- `-c, --category <type>` - Filter by category (framework, language, tool, platform, concept)
- `-l, --limit <number>` - Limit number of skills shown (default: 20)

**Detailed Skill View** (`--skill <name>`):
- Proficiency score and level (beginner/intermediate/advanced/expert)
- Usage statistics (sessions, first/last used dates)
- Experience duration and consistency metrics
- Related skills and learning recommendations
- Next milestone with progress indicator
- Monthly progress visualization

**Proficiency Calculation:**
- 40% usage count (logarithmic scale)
- 20% time investment (days of experience)
- 20% consistency (recency and regularity)
- 20% depth (average session quality)

**Examples:**
```bash
# Overview of all skills
claude-stats skills

# Detailed Next.js progress
claude-stats skills --skill "Next.js"

# Framework skills only
claude-stats skills --category framework

# Top 10 skills
claude-stats skills --limit 10
```

**Detected Skills Include:**
- **Frameworks**: Next.js, React, Vue, Angular, Svelte, Express, NestJS, Rails
- **Languages**: TypeScript, JavaScript, Python, Ruby, Go, Rust
- **Tools**: Git, Docker, Webpack, Vite, Vitest, Jest, Claude Code
- **Platforms**: PostgreSQL, MongoDB, Redis, AWS, Vercel
- **Concepts**: AI/ML, Web Audio

## Data Storage

Analytics data is stored in SQLite database at:
- `~/.claude/analytics.db`

The database schema includes:
- `sessions` - Grouped prompts with session metadata
- `prompts` - Individual prompt entries
- `projects` - Aggregated project statistics
- `daily_stats` - Daily rollup statistics
- `habits` - Detected habit patterns (future)
- `skills` - Skill progression tracking (future)

## Roadmap

### Phase 1: Data Collection ✓
- [x] Parse history.jsonl
- [x] Parse .claude.json
- [x] SQLite database schema
- [x] Data sync utility
- [x] Basic CLI commands

### Phase 2: Analytics Dashboard ✅
- [x] Weekly/monthly stats
- [x] Cost breakdown by project
- [x] Token usage optimization suggestions
- [x] Session heatmap visualization
- [x] Export to CSV/JSON

### Phase 3: Habit Tracking ✅
- [x] Pattern detection algorithms (time, day, focus)
- [x] Productivity streak tracking (current & longest)
- [x] Context efficiency analysis
- [x] Usage pattern detection (Multi-Project Juggler, Context Switcher, etc.)
- [x] Best practice recommendations (personalized, prioritized)

### Phase 4: Skill Progression ✅
- [x] Skill taxonomy (frameworks, languages, tools, platforms, concepts)
- [x] Usage-based proficiency scoring (weighted algorithm)
- [x] Learning path recommendations (related skills)
- [x] Milestone achievements (progress tracking)

### Phase 5: Integration
- [ ] Real-time monitoring (hook integration)
- [ ] Slack/Discord notifications
- [ ] Web dashboard
- [ ] Compare with other developers (anonymized)

## Development

### Build

```bash
npm run build
```

### Watch mode

```bash
npm run dev
```

### Run tests

```bash
npm test
```

### Type checking

```bash
npm run typecheck
```

## Architecture

```
src/
├── cli.ts              # CLI entry point
├── types/              # TypeScript types and Zod schemas
├── parsers/            # History and config parsers
│   ├── history-parser.ts
│   └── project-parser.ts
├── database/           # SQLite schema and connection
│   ├── db.ts
│   └── schema.ts
├── utils/              # Utilities (sync, etc.)
│   └── sync.ts
└── commands/           # CLI command implementations (future)
```

## Relationship to Contextualizer

This project is complementary to [Contextualizer](https://github.com/yourusername/contextualizer):

- **Contextualizer**: Project setup, health monitoring, context optimization
- **Claude Analytics**: Personal usage analytics, habit tracking, skill progression

Both can be used together. Once both projects mature, they may share common infrastructure or merge.

## License

MIT
