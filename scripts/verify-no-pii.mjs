#!/usr/bin/env node
/**
 * verify-no-pii.mjs
 *
 * Trust contract guardrail. Run in CI and locally via `npm run verify-no-pii`.
 *
 * Checks:
 *   1. Schema allowlist  -- every pgTable column in src/db/schema.ts must
 *      be listed in scripts/allowed_columns.yaml. New columns require a
 *      PRIVACY.md update in the same PR.
 *   2. No multipart/form-data route handlers anywhere under src/.
 *      Liveness runs in the browser; the server has no endpoint that
 *      accepts an image upload.
 *   3. No hard-coded API keys (regex match for typical formats).
 *   4. No raw device fingerprint or biometric template usage in server /
 *      db code. The persisted visitor-id hash must come from
 *      `hashFingerprint()` in `src/lib/crypto.ts`. The visitor id itself
 *      is computed in the browser by the MIT-clean `browserVisitorId()`
 *      helper in `src/lib/browser-id.ts` -- never round-tripped raw.
 *      A regex banlist also rejects column names that look like biometric
 *      templates (face_embedding, iris_template, etc.).
 *
 * Exits 0 on success, 1 on any violation. Prints a punch list.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(process.cwd());
const SCHEMA_PATH = path.join(ROOT, "src/db/schema.ts");
const ALLOWLIST_PATH = path.join(ROOT, "scripts/allowed_columns.yaml");
const SRC_DIR = path.join(ROOT, "src");
const CRYPTO_PATH = path.join(ROOT, "src/lib/crypto.ts");

const violations = [];

/** ---------- 1. Schema allowlist ---------- */
async function checkSchema() {
  const src = await readFile(SCHEMA_PATH, "utf8");
  const allowlistRaw = await readFile(ALLOWLIST_PATH, "utf8");
  const allowlist = parseSimpleYaml(allowlistRaw);

  const tables = extractPgTables(src);
  for (const { name, body } of tables) {
    const allowed = allowlist[name];
    if (!allowed) {
      violations.push(
        `[schema] table "${name}" is not declared in scripts/allowed_columns.yaml`,
      );
      continue;
    }
    const columns = extractColumns(body);
    for (const col of columns) {
      if (!allowed.includes(col)) {
        violations.push(
          `[schema] column "${name}.${col}" is in src/db/schema.ts but not in scripts/allowed_columns.yaml -- did you also update PRIVACY.md?`,
        );
      }
    }
  }

  for (const tableName of Object.keys(allowlist)) {
    if (!tables.find((t) => t.name === tableName)) {
      violations.push(
        `[schema] table "${tableName}" is in scripts/allowed_columns.yaml but no pgTable("${tableName}", ...) exists in src/db/schema.ts`,
      );
    }
  }
}

/**
 * Brace-balanced extraction of every `pgTable("name", { ... })` body.
 * The previous regex-based version stopped at the first nested `{` and
 * therefore silently saw only the first column of each table.
 */
function extractPgTables(src) {
  const out = [];
  const re = /pgTable\(\s*["']([a-z_][a-z0-9_]*)["']\s*,\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    let i = re.lastIndex; // position right after the opening `{`
    let depth = 1;
    let inString = null;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (inString) {
        if (c === "\\") {
          i += 2;
          continue;
        }
        if (c === inString) inString = null;
      } else if (c === '"' || c === "'" || c === "`") {
        inString = c;
      } else if (c === "{") {
        depth++;
      } else if (c === "}") {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    out.push({ name, body: src.slice(re.lastIndex, i) });
  }
  return out;
}

/**
 * From a table body, extract every column-literal name. A column declaration
 * has the shape:
 *   <propertyKey>: <typeFn>("<column_name>", ...)
 * with optional `.notNull()`, `.references(...)`, etc. trailing.
 *
 * We deliberately do not pick up column-name strings from inside indexes,
 * references, or `sql\`...\`` template literals -- those are handled by the
 * outer brace-balanced split keeping us inside the top-level body.
 */
function extractColumns(body) {
  const re = /(?:^|\s|,)([a-zA-Z_$][\w$]*)\s*:\s*[a-zA-Z_$][\w$]*\(\s*["']([a-z_][a-z0-9_]*)["']/g;
  const seen = new Set();
  let m;
  while ((m = re.exec(body)) !== null) {
    seen.add(m[2]);
  }
  return [...seen];
}

/** ---------- 2. No multipart/form-data anywhere in src/ ---------- */
async function checkNoMultipart() {
  const files = await walk(SRC_DIR);
  for (const f of files) {
    if (!f.endsWith(".ts") && !f.endsWith(".tsx")) continue;
    if (f === path.resolve(__filename())) continue;
    const rel = path.relative(ROOT, f);
    const src = await readFile(f, "utf8");
    const allowFormData = /\/\/\s*verify-no-pii:\s*allow-formdata/.test(src);

    if (/multipart\/form-data/i.test(src)) {
      violations.push(
        `[trust] ${rel} mentions multipart/form-data -- the server must never accept image uploads`,
      );
    }
    // Any route handler under src/app/api that calls `request.formData()`
    // is suspect. Allowlist with a `// verify-no-pii: allow-formdata` line
    // comment if you have a justified non-biometric form handler.
    const isApiRoute = /^src\/app\/api\//.test(rel);
    if (isApiRoute && /\.formData\s*\(\s*\)/.test(src) && !allowFormData) {
      violations.push(
        `[trust] ${rel} reads request.formData() in an API route -- the server must never accept image uploads. Add a "// verify-no-pii: allow-formdata" comment if this is intentional and non-biometric.`,
      );
    }
  }
}

/** ---------- 3. No hard-coded API keys ---------- */
async function checkNoSecrets() {
  const files = await walk(SRC_DIR);
  const secretPatterns = [
    { name: "OpenAI key", re: /sk-[A-Za-z0-9]{20,}/ },
    { name: "Google OAuth client secret", re: /GOCSPX-[A-Za-z0-9_-]{20,}/ },
    { name: "AWS access key", re: /AKIA[0-9A-Z]{16}/ },
    { name: "Slack token", re: /xox[baprs]-[A-Za-z0-9-]{20,}/ },
    { name: "JWT-looking string", re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  ];
  for (const f of files) {
    if (!f.endsWith(".ts") && !f.endsWith(".tsx") && !f.endsWith(".mjs") && !f.endsWith(".js")) continue;
    const src = await readFile(f, "utf8");
    for (const { name, re } of secretPatterns) {
      if (re.test(src)) {
        violations.push(`[secret] ${path.relative(ROOT, f)} contains what looks like a ${name}`);
      }
    }
  }
}

/** ---------- 4. No raw fingerprint usage outside the browser ---------- */
async function checkNoRawFingerprint() {
  const files = await walk(SRC_DIR);
  for (const f of files) {
    if (!f.endsWith(".ts") && !f.endsWith(".tsx")) continue;
    if (path.resolve(f) === CRYPTO_PATH) continue;
    const rel = path.relative(ROOT, f);
    const src = await readFile(f, "utf8");

    // Identifier-style names that imply raw-fingerprint persistence.
    const sus = [
      /\b(raw_fingerprint|rawFingerprint|fingerprint_raw|fingerprintRaw|fp_raw|fpRaw|deviceFingerprintRaw)\b/,
    ];
    for (const re of sus) {
      if (re.test(src)) {
        violations.push(
          `[trust] ${rel} references a raw-fingerprint variable -- only the peppered hash may be persisted`,
        );
      }
    }

    // Identifier-style names that imply biometric template persistence.
    // The schema allowlist would catch a column with one of these names,
    // but the failure message would say "schema drift" not "biometric"; an
    // explicit ban makes the wrong intent fail loudly.
    const biometric = [
      /\b(face_embedding|faceEmbedding|face_landmark|faceLandmark|face_descriptor|faceDescriptor|iris_template|irisTemplate|voice_print|voicePrint|biometric_template|biometricTemplate)\b/,
    ];
    for (const re of biometric) {
      if (re.test(src)) {
        violations.push(
          `[trust] ${rel} references a biometric-template variable -- this product never persists biometric data of any kind`,
        );
      }
    }
  }
}

/** ---------- helpers ---------- */
async function walk(dir) {
  let out = [];
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e);
    const st = await stat(full);
    if (st.isDirectory()) {
      if (e === "node_modules" || e === ".next" || e === "migrations") continue;
      out = out.concat(await walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function __filename() {
  return new URL(import.meta.url).pathname;
}

/**
 * Tiny ad-hoc YAML parser for our restricted format:
 *   table_name:
 *     - col_a
 *     - col_b
 * Comments (#...) and blank lines ignored.
 */
function parseSimpleYaml(text) {
  const out = {};
  let current = null;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/#.*$/, "").replace(/\s+$/, "");
    if (!line.trim()) continue;
    const tableMatch = line.match(/^([a-z_][a-z0-9_]*):\s*$/);
    if (tableMatch) {
      current = tableMatch[1];
      out[current] = [];
      continue;
    }
    const colMatch = line.match(/^\s*-\s*([a-z_][a-z0-9_]*)\s*$/);
    if (colMatch && current) {
      out[current].push(colMatch[1]);
    }
  }
  return out;
}

/** ---------- main ---------- */
async function main() {
  await checkSchema();
  await checkNoMultipart();
  await checkNoSecrets();
  await checkNoRawFingerprint();

  if (violations.length === 0) {
    console.log("verify-no-pii: OK");
    process.exit(0);
  }
  console.error("verify-no-pii: FAIL");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

main().catch((err) => {
  console.error("verify-no-pii: crashed", err);
  process.exit(2);
});
