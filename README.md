# Claude Analytics

Analytics and habit tracking for Claude Code usage. Track your sessions, prompts, costs, and skill progression over time.

## Features

- 📊 Session and prompt tracking
- 💰 Cost and token usage analytics
- 📈 Project-level statistics
- 🎯 Habit pattern detection (coming soon)
- 🚀 Skill progression tracking (coming soon)
- 📅 Daily/weekly/monthly reports (coming soon)

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

### Phase 3: Habit Tracking
- [ ] Pattern detection algorithms
- [ ] Productivity streak tracking
- [ ] Context efficiency analysis
- [ ] Tool usage patterns
- [ ] Best practice recommendations

### Phase 4: Skill Progression
- [ ] Skill taxonomy (frameworks, languages, tools)
- [ ] Usage-based proficiency scoring
- [ ] Learning path recommendations
- [ ] Milestone achievements

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
