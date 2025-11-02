/**
 * Skill Taxonomy
 *
 * Defines skill categories and detection patterns
 */

export interface SkillDefinition {
  name: string;
  category: 'framework' | 'language' | 'tool' | 'platform' | 'concept';
  detectionPatterns: string[]; // Regex patterns or keywords
  relatedSkills: string[]; // Skills that commonly appear together
  learningPath: string[]; // Ordered progression
}

/**
 * Comprehensive skill taxonomy
 */
export const SKILL_TAXONOMY: SkillDefinition[] = [
  // JavaScript/TypeScript Frameworks
  {
    name: 'Next.js',
    category: 'framework',
    detectionPatterns: ['next', 'nextjs', 'next.js'],
    relatedSkills: ['React', 'TypeScript', 'Node.js'],
    learningPath: ['React', 'Next.js', 'Next.js Advanced'],
  },
  {
    name: 'React',
    category: 'framework',
    detectionPatterns: ['react', 'react-'],
    relatedSkills: ['JavaScript', 'TypeScript', 'JSX'],
    learningPath: ['JavaScript', 'React', 'React Hooks', 'React Advanced'],
  },
  {
    name: 'Vue',
    category: 'framework',
    detectionPatterns: ['vue', 'nuxt'],
    relatedSkills: ['JavaScript', 'TypeScript'],
    learningPath: ['JavaScript', 'Vue', 'Vue 3', 'Nuxt'],
  },
  {
    name: 'Angular',
    category: 'framework',
    detectionPatterns: ['angular', '@angular'],
    relatedSkills: ['TypeScript', 'RxJS'],
    learningPath: ['TypeScript', 'Angular', 'Angular Advanced'],
  },
  {
    name: 'Svelte',
    category: 'framework',
    detectionPatterns: ['svelte', 'sveltekit'],
    relatedSkills: ['JavaScript', 'TypeScript'],
    learningPath: ['JavaScript', 'Svelte', 'SvelteKit'],
  },

  // Backend Frameworks
  {
    name: 'Express',
    category: 'framework',
    detectionPatterns: ['express'],
    relatedSkills: ['Node.js', 'JavaScript'],
    learningPath: ['Node.js', 'Express', 'REST APIs'],
  },
  {
    name: 'Fastify',
    category: 'framework',
    detectionPatterns: ['fastify'],
    relatedSkills: ['Node.js', 'JavaScript'],
    learningPath: ['Node.js', 'Fastify', 'High Performance APIs'],
  },
  {
    name: 'NestJS',
    category: 'framework',
    detectionPatterns: ['nest', '@nestjs'],
    relatedSkills: ['TypeScript', 'Node.js'],
    learningPath: ['TypeScript', 'NestJS', 'Microservices'],
  },
  {
    name: 'Rails',
    category: 'framework',
    detectionPatterns: ['rails', 'ruby-on-rails'],
    relatedSkills: ['Ruby', 'ActiveRecord', 'PostgreSQL'],
    learningPath: ['Ruby', 'Rails', 'Rails Advanced'],
  },

  // Languages
  {
    name: 'TypeScript',
    category: 'language',
    detectionPatterns: ['typescript', '.ts', 'tsconfig'],
    relatedSkills: ['JavaScript', 'Node.js'],
    learningPath: ['JavaScript', 'TypeScript', 'TypeScript Advanced'],
  },
  {
    name: 'JavaScript',
    category: 'language',
    detectionPatterns: ['javascript', '.js', 'node'],
    relatedSkills: ['HTML', 'CSS'],
    learningPath: ['JavaScript', 'ES6+', 'Async/Await'],
  },
  {
    name: 'Python',
    category: 'language',
    detectionPatterns: ['python', '.py', 'pip'],
    relatedSkills: ['Django', 'Flask', 'FastAPI'],
    learningPath: ['Python', 'Python OOP', 'Python Advanced'],
  },
  {
    name: 'Ruby',
    category: 'language',
    detectionPatterns: ['ruby', '.rb', 'gemfile'],
    relatedSkills: ['Rails'],
    learningPath: ['Ruby', 'Ruby OOP', 'Rails'],
  },
  {
    name: 'Go',
    category: 'language',
    detectionPatterns: ['golang', 'go.mod', '/go/'],
    relatedSkills: ['Microservices', 'Docker'],
    learningPath: ['Go', 'Go Concurrency', 'Go Advanced'],
  },
  {
    name: 'Rust',
    category: 'language',
    detectionPatterns: ['rust', 'cargo', '.rs'],
    relatedSkills: ['Systems Programming'],
    learningPath: ['Rust', 'Rust Ownership', 'Rust Advanced'],
  },

  // Tools & Build Systems
  {
    name: 'Git',
    category: 'tool',
    detectionPatterns: ['git', '.git', 'github'],
    relatedSkills: ['Version Control'],
    learningPath: ['Git Basics', 'Git Branching', 'Git Advanced'],
  },
  {
    name: 'Docker',
    category: 'tool',
    detectionPatterns: ['docker', 'dockerfile', 'container'],
    relatedSkills: ['DevOps', 'Kubernetes'],
    learningPath: ['Docker', 'Docker Compose', 'Kubernetes'],
  },
  {
    name: 'Webpack',
    category: 'tool',
    detectionPatterns: ['webpack', 'webpack.config'],
    relatedSkills: ['JavaScript', 'Build Tools'],
    learningPath: ['Webpack', 'Webpack Optimization'],
  },
  {
    name: 'Vite',
    category: 'tool',
    detectionPatterns: ['vite', 'vite.config'],
    relatedSkills: ['JavaScript', 'Build Tools'],
    learningPath: ['Vite', 'Vite Advanced'],
  },

  // Databases
  {
    name: 'PostgreSQL',
    category: 'platform',
    detectionPatterns: ['postgres', 'postgresql', 'psql'],
    relatedSkills: ['SQL', 'Database Design'],
    learningPath: ['SQL', 'PostgreSQL', 'Database Optimization'],
  },
  {
    name: 'MongoDB',
    category: 'platform',
    detectionPatterns: ['mongo', 'mongodb'],
    relatedSkills: ['NoSQL', 'Database Design'],
    learningPath: ['MongoDB', 'Mongoose', 'MongoDB Advanced'],
  },
  {
    name: 'Redis',
    category: 'platform',
    detectionPatterns: ['redis'],
    relatedSkills: ['Caching', 'In-Memory Databases'],
    learningPath: ['Redis', 'Redis Advanced'],
  },

  // Cloud Platforms
  {
    name: 'AWS',
    category: 'platform',
    detectionPatterns: ['aws', 'amazon-web-services', 's3', 'ec2', 'lambda'],
    relatedSkills: ['Cloud', 'DevOps'],
    learningPath: ['AWS Basics', 'AWS Services', 'AWS Architecture'],
  },
  {
    name: 'Vercel',
    category: 'platform',
    detectionPatterns: ['vercel'],
    relatedSkills: ['Next.js', 'Deployment'],
    learningPath: ['Vercel', 'Edge Functions'],
  },

  // Testing
  {
    name: 'Vitest',
    category: 'tool',
    detectionPatterns: ['vitest'],
    relatedSkills: ['Testing', 'JavaScript'],
    learningPath: ['Testing Basics', 'Vitest', 'Advanced Testing'],
  },
  {
    name: 'Jest',
    category: 'tool',
    detectionPatterns: ['jest'],
    relatedSkills: ['Testing', 'JavaScript'],
    learningPath: ['Testing Basics', 'Jest', 'Advanced Testing'],
  },

  // Concepts
  {
    name: 'AI/ML',
    category: 'concept',
    detectionPatterns: ['ai', 'ml', 'machine-learning', 'neural', 'llm'],
    relatedSkills: ['Python', 'TensorFlow', 'PyTorch'],
    learningPath: ['ML Basics', 'Deep Learning', 'Production ML'],
  },
  {
    name: 'Web Audio',
    category: 'concept',
    detectionPatterns: ['audio', 'tone.js', 'web-audio', 'sound', 'music'],
    relatedSkills: ['JavaScript', 'Signal Processing'],
    learningPath: ['Web Audio API', 'Audio Processing', 'Music Theory'],
  },
  {
    name: 'Claude Code',
    category: 'tool',
    detectionPatterns: ['claude', 'claude-code', 'anthropic'],
    relatedSkills: ['AI-Assisted Development', 'Prompt Engineering'],
    learningPath: ['Claude Basics', 'Prompt Optimization', 'Claude Advanced'],
  },
];

/**
 * Detect skills from project path
 */
export function detectSkillsFromPath(projectPath: string): string[] {
  const lowerPath = projectPath.toLowerCase();
  const detected: string[] = [];

  for (const skill of SKILL_TAXONOMY) {
    for (const pattern of skill.detectionPatterns) {
      if (lowerPath.includes(pattern.toLowerCase())) {
        detected.push(skill.name);
        break;
      }
    }
  }

  return detected;
}

/**
 * Get skill definition
 */
export function getSkillDefinition(skillName: string): SkillDefinition | undefined {
  return SKILL_TAXONOMY.find(
    (s) => s.name.toLowerCase() === skillName.toLowerCase()
  );
}

/**
 * Get related skills for a skill
 */
export function getRelatedSkills(skillName: string): string[] {
  const skill = getSkillDefinition(skillName);
  return skill?.relatedSkills || [];
}

/**
 * Get learning path for a skill
 */
export function getLearningPath(skillName: string): string[] {
  const skill = getSkillDefinition(skillName);
  return skill?.learningPath || [];
}

/**
 * Get skills by category
 */
export function getSkillsByCategory(
  category: SkillDefinition['category']
): SkillDefinition[] {
  return SKILL_TAXONOMY.filter((s) => s.category === category);
}
