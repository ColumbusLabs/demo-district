import { appendFile, readFile } from 'node:fs/promises';

// Logs/job summaries do not use Actions artifact storage. Never upload these reports.
let summary = '## Demo District verification\n\nStandard ubuntu-latest only; public-repository gate; no cache or artifact uploads.\n\n';
for (const [label, file] of [['Production browser', 'test-results/production-results.json'], ['Lifecycle/navigation', 'test-results/lifecycle-results.json']]) {
  try {
    const { stats } = JSON.parse(await readFile(file, 'utf8'));
    summary += `- ${label}: ${stats.expected} expected, ${stats.unexpected} unexpected, ${stats.flaky} flaky, ${stats.skipped} skipped.\n`;
  } catch { summary += `- ${label}: report unavailable; consult earlier step failure (not a pass).\n`; }
}
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
