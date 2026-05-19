import { ingestFolder } from '../src/services/ai/ingestion';

async function main() {
  await ingestFolder('./public/pdfs/maths', 'Mathématiques');
  await ingestFolder('./public/pdfs/français', 'Français');
  // etc.
}

main();