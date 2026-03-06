import path from 'node:path';
import { buildSite } from '../src/renderers/site';

async function main(): Promise<void> {
  await buildSite(path.resolve(process.cwd()), process.env.SITE_BASE_PATH ?? '/');
  console.log('Built static site in dist/');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
