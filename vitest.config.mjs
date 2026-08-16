import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude nested git worktrees under .claude/ (leftover checkouts from
    // other sessions/tools) on top of vitest's own defaults — without this,
    // a stray worktree's own copy of a test file gets picked up and run
    // against this repo's real content/src (since both share process.cwd()),
    // duplicating every test and occasionally running stale test logic.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.{git,cache}/**', '.claude/**'],
  },
});
