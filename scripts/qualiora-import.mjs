#!/usr/bin/env node
/**
 * POST Playwright JSON results to Qualiora automation import API.
 * Maps @DEMO-TC-xxxx titles (or qualiora-map.json) to test case UUIDs.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const TEST_CASE_CODE_PATTERN = /@((?:DEMO-)?TC-\d{4})\b/i;
const DEFAULT_ENV_ID = '44444444-0000-4000-8000-000000000005'; // DEMO STG

function parseTestCaseCode(text) {
  const match = TEST_CASE_CODE_PATTERN.exec(text);
  return match?.[1]?.toUpperCase();
}

function mapPlaywrightStatus(status) {
  switch (status) {
    case 'passed':
      return 'PASSED';
    case 'failed':
    case 'timedOut':
      return 'FAILED';
    case 'skipped':
    case 'interrupted':
      return 'SKIPPED';
    default:
      return null;
  }
}

function flattenPlaywrightReport(report) {
  const rows = [];

  const processSpec = (spec, titlePath) => {
    const fullTitlePath = spec.title ? [...titlePath, spec.title] : titlePath;
    const codeFromTitle = parseTestCaseCode(fullTitlePath.join(' '));
    for (const test of spec.tests ?? []) {
      const result = test.results?.[test.results.length - 1];
      if (!result) continue;
      const status = mapPlaywrightStatus(result.status);
      if (!status) continue;
      rows.push({
        specFile: spec.file,
        testTitle: spec.title,
        status,
        durationMs: Math.max(0, Math.round(result.duration ?? 0)),
        errorMessage: result.error?.message,
        testCaseCode: codeFromTitle,
      });
    }
  };

  const walkSuite = (suite, titlePath) => {
    const nextPath = suite.title ? [...titlePath, suite.title] : titlePath;
    for (const child of suite.suites ?? []) walkSuite(child, nextPath);
    for (const spec of suite.specs ?? []) processSpec(spec, nextPath);
  };

  for (const suite of report.suites ?? []) walkSuite(suite, []);
  return rows;
}

function normalizeSpecPath(file) {
  return file.replaceAll('\\', '/').replace(/^\.\//, '');
}

function applySidecarMap(rows, sidecar) {
  return rows.map((row) => {
    if (row.testCaseCode) return row;
    const rel = normalizeSpecPath(row.specFile);
    const keys = [`${rel}::${row.testTitle}`, rel];
    for (const key of keys) {
      const code = sidecar[key];
      if (code) return { ...row, testCaseCode: code.toUpperCase() };
    }
    return row;
  });
}

async function apiFetch(baseUrl, path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { ok: res.ok, status: res.status, json, text };
}

async function login(apiBase, email, password) {
  const res = await apiFetch(apiBase, '/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!res.ok) {
    throw new Error(`Login failed (${res.status}): ${res.text}`);
  }
  return res.json.accessToken;
}

async function resolveProjectId(apiBase, token, projectKey) {
  const res = await apiFetch(apiBase, `/api/v1/projects/${projectKey}`, { token });
  if (!res.ok) {
    throw new Error(`Project lookup failed (${res.status}): ${res.text}`);
  }
  return res.json.id;
}

async function fetchTestCaseMap(apiBase, token, projectKey) {
  const res = await apiFetch(apiBase, `/api/v1/projects/${projectKey}/test-cases/summary`, {
    token,
  });
  if (!res.ok) {
    console.warn(`[qualiora-import] test case summary failed (${res.status})`);
    return new Map();
  }
  const rows = res.json;
  return new Map(rows.map((row) => [row.code.toUpperCase(), row.id]));
}

function launchName() {
  const branch = process.env.GITHUB_REF_NAME ?? process.env.GIT_BRANCH ?? 'local';
  const build = process.env.GITHUB_RUN_NUMBER ?? `local-${Date.now()}`;
  return `Playwright checkout-e2e — ${branch} #${build}`;
}

async function main() {
  const resultsPath = resolve(process.argv[2] ?? 'test-results/results.json');
  const skip = process.env.QUALIORA_IMPORT === 'false';

  if (skip) {
    console.log('[qualiora-import] skipped (QUALIORA_IMPORT=false)');
    return;
  }

  if (!existsSync(resultsPath)) {
    console.warn(`[qualiora-import] no report at ${resultsPath}`);
    console.warn('[qualiora-import] run `npm test` first (writes test-results/results.json), then import again.');
    process.exit(1);
  }

  const apiBase = (process.env.QUALIORA_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const email = process.env.QUALIORA_CI_EMAIL ?? process.env.E2E_USER_EMAIL ?? 'demo@qualiora.ai';
  const password = process.env.QUALIORA_CI_PASSWORD ?? process.env.E2E_USER_PASSWORD;
  const projectKey = process.env.QUALIORA_PROJECT_KEY ?? 'DEMO';
  const environmentId = process.env.QUALIORA_ENVIRONMENT_ID ?? DEFAULT_ENV_ID;

  if (!password?.trim()) {
    console.warn('[qualiora-import] QUALIORA_CI_PASSWORD not set — skip upload');
    process.exit(0);
  }

  const health = await apiFetch(apiBase, '/api/health');
  if (!health.ok) {
    console.warn('[qualiora-import] API not reachable — skip upload');
    process.exit(0);
  }

  const sidecarPath = process.env.QUALIORA_MAP_PATH ?? resolve(ROOT, 'qualiora-map.json');
  const sidecar = existsSync(sidecarPath)
    ? JSON.parse(readFileSync(sidecarPath, 'utf8'))
    : {};

  const report = JSON.parse(readFileSync(resultsPath, 'utf8'));
  const flat = applySidecarMap(flattenPlaywrightReport(report), sidecar);

  const token = await login(apiBase, email, password.trim());
  const projectId =
    process.env.QUALIORA_PROJECT_ID ?? (await resolveProjectId(apiBase, token, projectKey));
  const codeToId = await fetchTestCaseMap(apiBase, token, projectKey);

  const results = flat.flatMap((row) => {
    const code = row.testCaseCode?.toUpperCase();
    if (!code) {
      console.warn(`[qualiora-import] skip unmapped: ${row.specFile} :: ${row.testTitle}`);
      return [];
    }
    const testCaseId = codeToId.get(code) ?? sidecar[code];
    if (!testCaseId) {
      console.warn(`[qualiora-import] unknown code ${code}`);
      return [];
    }
    return [
      {
        testCaseId,
        environmentId,
        status: row.status,
        duration: row.durationMs,
        automationTool: 'playwright',
        errorMessage: row.status === 'FAILED' ? row.errorMessage?.slice(0, 2000) : undefined,
      },
    ];
  });

  if (results.length === 0) {
    console.warn('[qualiora-import] no mappable results');
    process.exit(1);
  }

  const importRes = await apiFetch(apiBase, '/api/v1/automation/import', {
    method: 'POST',
    token,
    body: {
      launch: {
        projectId,
        name: launchName(),
        environmentId,
        branch: process.env.GITHUB_REF_NAME ?? process.env.GIT_BRANCH ?? 'local',
        buildNumber: String(process.env.GITHUB_RUN_NUMBER ?? Date.now()),
        ciPipeline: process.env.GITHUB_WORKFLOW ?? 'qualiora-demo/playwright',
        source: 'playwright',
        ...(report.stats?.startTime ? { startedAt: report.stats.startTime } : {}),
        ...(report.stats?.duration == null
          ? {}
          : { durationMs: Math.max(0, Math.round(report.stats.duration)) }),
      },
      results,
    },
  });

  if (importRes.status === 202) {
    console.log(
      `[qualiora-import] queued ${results.length} result(s) — importId=${importRes.json?.importId ?? '?'} launchId=${importRes.json?.launchId ?? '?'}`,
    );
    return;
  }

  console.error(`[qualiora-import] import failed (${importRes.status}): ${importRes.text}`);
  process.exit(1);
}

try {
  await main();
} catch (err) {
  console.error('[qualiora-import]', err.message ?? err.toString());
  process.exit(1);
}
