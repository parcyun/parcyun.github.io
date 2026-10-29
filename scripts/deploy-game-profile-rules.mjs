import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const project = 'parcyun';
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const headers = { Authorization: `Bearer ${token}`, 'x-goog-user-project': project, 'Content-Type': 'application/json' };
const content = await readFile(new URL('../firebase/firestore.rules', import.meta.url), 'utf8');
async function request(path, method, body) {
  const response = await fetch(`https://firebaserules.googleapis.com/v1/projects/${project}/${path}`, { method, headers, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data.error));
  return data;
}
const ruleset = await request('rulesets', 'POST', { source: { files: [{ name: 'firestore.rules', content }] } });
const release = { name: `projects/${project}/releases/cloud.firestore`, rulesetName: ruleset.name };
const existing = await fetch(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`, { headers });
if (existing.ok) await request('releases/cloud.firestore', 'PATCH', { release, updateMask: 'rulesetName' });
else if (existing.status === 404) await request('releases', 'POST', release);
else throw new Error(`Cannot inspect current rules: ${existing.status}`);
console.log(`Published owner-only profile rules to ${project}.`);
