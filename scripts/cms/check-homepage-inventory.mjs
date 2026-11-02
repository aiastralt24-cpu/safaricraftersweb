import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Read-only freshness check. Success proves the traced files are unchanged,
// not that the homepage is editable, migrated, or approved for release.
const root = fileURLToPath(new URL('../../', import.meta.url));
const inventory = JSON.parse(await readFile(path.join(root, 'docs/cms/homepage-editability-inventory.json'), 'utf8'));
const failures = [];
const seen = new Set();
if (inventory.version !== 1 || inventory.route !== '/' || !Array.isArray(inventory.sourceProof) || !inventory.sourceProof.length) {
  throw new Error('Invalid homepage inventory source proof.');
}
for (const proof of inventory.sourceProof) {
  if (typeof proof.path !== 'string' || path.isAbsolute(proof.path) || proof.path.split(/[\\/]/).includes('..') || seen.has(proof.path) || !/^[a-f0-9]{64}$/.test(proof.sha256)) {
    throw new Error('Invalid or duplicate homepage source proof entry.');
  }
  seen.add(proof.path);
  try {
    const actual = createHash('sha256').update(await readFile(path.join(root, proof.path))).digest('hex');
    if (actual !== proof.sha256) failures.push(`${proof.path}: changed; re-inspect its content and dependent inventory before updating the proof.`);
  } catch {
    failures.push(`${proof.path}: unreadable.`);
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Homepage inventory: ${seen.size} traced source hashes match. This is not release or editability approval.`);
}
