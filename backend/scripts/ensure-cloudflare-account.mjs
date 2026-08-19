#!/usr/bin/env node
/**
 * Fail fast if Wrangler is authenticated to the wrong Cloudflare account.
 * Expected workers.dev subdomain must match the app API host (aasim-ss).
 */
import { execFileSync } from 'node:child_process';

const EXPECTED_SUBDOMAIN = 'aasim-ss';
const EXPECTED_WORKER_URL = `https://showlist-proxy.${EXPECTED_SUBDOMAIN}.workers.dev`;

function run(cmd, args) {
  return execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function fail(msg) {
  console.error(`\n❌ Cloudflare account check failed\n`);
  console.error(msg);
  console.error(`\nExpected worker URL: ${EXPECTED_WORKER_URL}`);
  console.error(`\nFix:`);
  console.error(`  1. npx wrangler auth create showlist-aasim`);
  console.error(`     (sign in with the Cloudflare account that owns *.${EXPECTED_SUBDOMAIN}.workers.dev)`);
  console.error(`  2. npx wrangler auth activate showlist-aasim "${process.cwd()}"`);
  console.error(`  3. npx wrangler whoami --json   # confirm email / account`);
  console.error(`  4. npm run deploy\n`);
  process.exit(1);
}

let whoami;
try {
  whoami = JSON.parse(run('npx', ['wrangler', 'whoami', '--json']));
} catch (e) {
  fail(`Could not run wrangler whoami. Are you logged in?\n${e.stderr || e.message}`);
}

if (!whoami.loggedIn) {
  fail('Not logged in to Cloudflare. Run: npx wrangler login');
}

const account = whoami.accounts?.[0];
if (!account?.id) {
  fail('No Cloudflare account found on this login.');
}

let token;
try {
  const raw = run('npx', ['wrangler', 'auth', 'token']);
  token = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && /^[A-Za-z0-9._-]+$/.test(l))
    .pop();
  if (!token) throw new Error('No token line found in wrangler auth token output');
} catch (e) {
  fail(`Could not read auth token.\n${e.stderr || e.message}`);
}

const res = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${account.id}/workers/subdomain`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const body = await res.json().catch(() => ({}));
if (!res.ok || !body.success) {
  fail(
    `Could not read workers.dev subdomain for account ${account.id}.\n` +
      JSON.stringify(body.errors || body, null, 2)
  );
}

const subdomain = body.result?.subdomain;
if (subdomain !== EXPECTED_SUBDOMAIN) {
  fail(
    `Logged in as ${whoami.email || '(unknown)'}\n` +
      `Account: ${account.name} (${account.id})\n` +
      `workers.dev subdomain: ${subdomain || '(none)'}\n` +
      `Required subdomain: ${EXPECTED_SUBDOMAIN}\n\n` +
      `Refusing to deploy to the wrong account.`
  );
}

console.log(`✅ Cloudflare account OK`);
console.log(`   email: ${whoami.email}`);
console.log(`   account: ${account.name} (${account.id})`);
console.log(`   workers.dev: *.${subdomain}.workers.dev`);
console.log(`   target: ${EXPECTED_WORKER_URL}`);
