import { v4 as uuidv4 } from 'uuid';
import { TECH_LEAD_PROMPT, DEVELOPER_PROMPT, TESTER_PROMPT } from './prompts';

export const defaultAgents = [
  {
    id: uuidv4(),
    name: 'Technical Lead',
    role: 'architect',
    avatar: 'TL',
    color: '#6366f1',
    skills: ['System Design', 'Architecture', 'Code Review', 'Tech Stack Selection', 'API Design'],
    systemPrompt: TECH_LEAD_PROMPT,
    outputFile: 'architecture-design.md',
  },
  {
    id: uuidv4(),
    name: 'Developer',
    role: 'developer',
    avatar: 'DE',
    color: '#10b981',
    skills: ['Full-Stack', 'React', 'Node.js', 'API Development', 'Database', 'Testing'],
    systemPrompt: DEVELOPER_PROMPT,
    outputFile: 'implementation-plan.md',
  },
  {
    id: uuidv4(),
    name: 'QA Engineer',
    role: 'tester',
    avatar: 'QA',
    color: '#f59e0b',
    skills: ['Testing', 'Bug Reporting', 'Test Plans', 'Security Testing', 'Code Review'],
    systemPrompt: TESTER_PROMPT,
    outputFile: 'qa-report.md',
  },
];

export function createAgent(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'New Agent',
    role: 'custom',
    avatar: 'NA',
    color: '#6b7280',
    skills: [],
    systemPrompt: 'You are a helpful software engineering agent.',
    outputFile: 'output.md',
    ...overrides,
  };
}
