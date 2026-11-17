// Creates the table if missing (idempotent). Used by `npm run db:create`.
import { ensureTable, target } from './table';

ensureTable()
  .then((result) => console.log(`==> ${target()}: ${result}`))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
