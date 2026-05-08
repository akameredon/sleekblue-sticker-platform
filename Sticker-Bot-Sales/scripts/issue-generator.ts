import fs from 'node:fs';
import path from 'node:path';

/**
 * PRD to Issues: Breaks product requirements documents into actionable Kanban issues.
 * This script parses PLAN.md and extracts checklist items as structured tasks.
 */

interface KanbanIssue {
  title: string;
  category: string;
  status: 'todo' | 'done';
  labels: string[];
}

function getLabels(title: string, category: string): string[] {
  const labels: string[] = [];
  const content = (title + ' ' + category).toLowerCase();
  
  if (content.includes('security') || content.includes('acl') || content.includes('auth')) labels.push('security');
  if (content.includes('ui') || content.includes('ux') || content.includes('style') || content.includes('frontend')) labels.push('frontend');
  if (content.includes('api') || content.includes('database') || content.includes('server') || content.includes('backend')) labels.push('backend');
  if (content.includes('critical') || content.includes('must-have') || content.includes('pricing')) labels.push('high-priority');
  
  return labels;
}

async function generateIssues() {
  const planPath = path.resolve(process.cwd(), 'PLAN.md');
  const content = fs.readFileSync(planPath, 'utf-8');
  
  const lines = content.split('\n');
  let newIssues: KanbanIssue[] = [];
  let currentCategory = 'General';

  lines.forEach((line) => {
    // Detect categories/phases
    if (line.startsWith('## ') || line.startsWith('### ')) {
      currentCategory = line.replace(/#+\s+/, '').trim();
    }

    // Detect checklist items
    const taskMatch = line.match(/^\s*\*\s+\[( |x)\]\s+\*\*(.+)\*\*/);
    if (taskMatch) {
      const title = taskMatch[2].trim();
      newIssues.push({
        title,
        category: currentCategory,
        status: taskMatch[1] === 'x' ? 'done' : 'todo',
        labels: getLabels(title, currentCategory),
      });
    }
  });

  const outputPath = path.resolve(process.cwd(), 'artifacts/kanban-export.json');
  let existingIssues: KanbanIssue[] = [];
  
  if (fs.existsSync(outputPath)) {
    existingIssues = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  }

  // Idempotency: Merge only unique titles
  const existingTitles = new Set(existingIssues.map(i => i.title));
  const uniqueNewIssues = newIssues.filter(i => !existingTitles.has(i.title));
  
  const finalIssues = [...existingIssues, ...uniqueNewIssues];

  console.log(`Deconstructed PRD. Added ${uniqueNewIssues.length} new issues. Total: ${finalIssues.length}.`);
  
  fs.writeFileSync(outputPath, JSON.stringify(finalIssues, null, 2));
  console.log(`Issues exported to: ${outputPath}`);
}

generateIssues().catch((err) => {
  console.error('Failed to generate issues:', err);
  process.exit(1);
});