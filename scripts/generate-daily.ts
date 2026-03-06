import path from 'node:path';
import { generateDailySnapshot } from '../src/lib/generate';

async function main(): Promise<void> {
  const rootDir = path.resolve(process.cwd());
  const allowOutsideWindow =
    process.env.ALLOW_OUTSIDE_WINDOW === '1' || process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';

  const result = await generateDailySnapshot({
    rootDir,
    allowOutsideWindow,
    forceDate: process.env.FORCE_DATE
  });

  if (result.status === 'skipped') {
    console.log(`Skipped daily generation: ${result.reason}`);
    return;
  }

  console.log(`Created daily entry for ${result.entry?.date}`);
  if (result.errors.length > 0) {
    console.warn(result.errors.join('\n'));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
