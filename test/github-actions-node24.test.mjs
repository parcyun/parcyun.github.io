import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');

test('GitHub Pages workflow builds and uploads entirely on Node 24 actions', () => {
  assert.match(workflow, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24:\s*true/);
  assert.match(workflow, /actions\/setup-node@v5[\s\S]*?node-version:\s*24/);
  assert.match(workflow, /actions\/upload-artifact@v6/);
  assert.match(workflow, /name:\s*github-pages/);
  assert.doesNotMatch(workflow, /actions\/upload-pages-artifact/);
  assert.doesNotMatch(workflow, /withastro\/action/);
});
