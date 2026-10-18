#!/usr/bin/env node
// Turn the last Playwright failure block into a GitHub annotation so the
// exact assertion is readable from the check run, not the artifact zip.
import { readFileSync } from 'node:fs';

const log = readFileSync(process.argv[2] || '/tmp/e2e.log', 'utf8');
const starts = [...log.matchAll(/^\s+\d+\) /gm)].map((match) => match.index);
const detail = (starts.length ? log.slice(starts.at(-1)) : log.slice(-7000)).slice(0, 7000);
const escaped = detail.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
console.log(`::error title=Playwright failure::${escaped}`);
