import { runSimulation } from '@/lib/ai-demo/simulation-engine';
import { getAllPersonas } from '@/lib/ai-demo/personas';
import { parseInterviewGuide } from '@/lib/ai-demo/guide-parser';

async function main() {
  const personas = getAllPersonas();
  const persona = personas[0];
  const interviewGuide = parseInterviewGuide(`## Introduction
- Can you walk me through your typical workflow when using our product?
- What is the most frustrating part of that process?
- How do you currently solve that frustration?`);

  const result = await runSimulation(persona, {
    interviewGuide,
    briefContent: `## Objectives
- Understand core workflow
- Identify current frustrations
- Measure solution fit`,
    projectObjectives: ['Understand core workflow', 'Identify current frustrations', 'Measure solution fit'],
    maxTurns: 12,
    timeoutMinutes: 2
  });

  console.log(JSON.stringify({
    persona: result.personaId,
    completed: result.completed,
    turns: result.transcript.length,
    coverage: result.metrics.agent.coverageRate,
  }, null, 2));
}

main().catch((error) => {
  console.error('Mock AI demo check failed', error);
  process.exit(1);
});
