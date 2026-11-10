// Taxation/checkModules.js
// Finds "file not imported or exported properly" problems WITHOUT starting the server.
// Run from the Taxation folder:   node checkModules.js
//
// It reads the files as plain text (nothing is executed, no database is touched) and checks:
//   1. every expected file exists
//   2. every expected export is listed in that file's module.exports
//   3. every relative require("./x") or require("../x") points at a file that exists, with
//      exactly the right letter case (Windows ignores case, Render/Linux does not)
// You can delete this file once everything is in place.

const fs = require("fs");
const path = require("path");

const root = __dirname;

// What each file must export (taken from the finished versions of the files).
const EXPECTED = {
  "controllers/vatController.js": ["ping", "getProfile", "updateProfile"],
  "controllers/periodController.js": ["listPeriods", "getPeriod", "changePeriodStatus", "getReconciliation"],
  "controllers/lineController.js": ["createLine", "listLines", "verifyPeriod", "updateLine", "reviewLine", "resolveFlag"],
  "controllers/exportController.js": ["createExport", "listExports", "downloadSchedule", "downloadReport"],
  "services/periodService.js": [
    "ServiceError", "TRANSITIONS", "periodBounds", "dueDateFor", "withDueInfo", "isEditable",
    "syncPeriods", "readinessCheck", "getPeriodSummary", "transitionPeriod", "markExported",
  ],
  "services/lineService.js": ["createLine", "listLines"],
  "services/lineBuilder.js": ["buildLine"],
  "services/verificationRules.js": ["checkLine", "mergeFlags", "unresolvedBlockers", "acknowledgeWarnings", "VAT_TOLERANCE_THEBE"],
  "services/verificationService.js": ["flagsForNewLine", "flagsForExistingLine", "verifyPeriod"],
  "services/reviewService.js": ["updateLine", "reviewLine", "resolveFlag", "ACTIONS", "REVIEW_TRANSITIONS"],
  "services/reconcileCalc.js": ["roundToPula", "summarizeRows", "finalize", "reconcileChain"],
  "services/reconcileService.js": ["reconcilePeriod"],
  "services/excelExport.js": [
    "SHEET_MIME", "periodLabel", "scheduleFileName", "reportFileName",
    "buildScheduleData", "buildScheduleWorkbook", "buildReportWorkbook",
  ],
  "services/exportService.js": ["createExport", "listExports", "getExport"],
  "utils/money.js": ["divRound", "parsePula", "thebeToPula", "rateToBp", "convertCurrency", "vatOnExclusive", "splitInclusive"],
  "routes/routes.js": [], // exports the router itself
  "index.js": [],
};

const problems = [];
const ok = (msg) => console.log(`  ok       ${msg}`);
const bad = (msg) => {
  problems.push(msg);
  console.log(`  PROBLEM  ${msg}`);
};

// Finds a file by name ignoring letter case; returns its real relative path, or null.
function findFile(rel) {
  const dir = path.dirname(rel);
  const base = path.basename(rel).toLowerCase();
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return null;
  const hit = fs.readdirSync(full).find((f) => f.toLowerCase() === base);
  return hit ? path.join(dir, hit).replace(/\\/g, "/") : null;
}

// The names listed in `module.exports = { ... }`, or null if the file does not use that form.
function exportsOf(source) {
  const m = /module\.exports\s*=\s*\{([\s\S]*?)\}\s*;?/.exec(source);
  if (!m) return null;
  return m[1]
    .split(",")
    .map((s) => s.split(":")[0].trim())
    .filter(Boolean);
}

// Does this exact path exist, with exactly this letter case in the last part?
function existsExactCase(fullPath) {
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).includes(path.basename(fullPath));
}

// ---- 1 and 2: expected files and their exports -------------------------------------------
console.log("Checking files and exports:");
const realNames = {};
for (const [rel, names] of Object.entries(EXPECTED)) {
  const real = findFile(rel);
  if (!real) {
    bad(`${rel} is MISSING`);
    continue;
  }
  realNames[rel] = real;
  if (real !== rel) console.log(`  note     ${rel} is named "${real}" here (fine, as long as every require uses that exact spelling)`);
  if (names.length === 0) {
    ok(real);
    continue;
  }
  const exported = exportsOf(fs.readFileSync(path.join(root, real), "utf8"));
  if (!exported) {
    bad(`${real} has no "module.exports = { ... }" block`);
    continue;
  }
  const missing = names.filter((n) => !exported.includes(n));
  if (missing.length) bad(`${real} does not export: ${missing.join(", ")}  (this file is probably an OLD version)`);
  else ok(`${real} exports ${names.length} names`);
}

// ---- 3: every relative require must resolve -----------------------------------------------
console.log("\nChecking require paths:");
function jsFilesIn(dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".js"))
    .map((e) => path.join(dir, e.name));
}
const toScan = ["index.js", ...["controllers", "services", "utils", "routes", "models"].flatMap(jsFilesIn)];
let requireCount = 0;

for (const rel of toScan) {
  if (!fs.existsSync(path.join(root, rel))) continue;
  const source = fs.readFileSync(path.join(root, rel), "utf8");
  const re = /require\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;
  let m;
  while ((m = re.exec(source))) {
    requireCount += 1;
    const target = path.resolve(path.dirname(path.join(root, rel)), m[1]);
    const candidates = [target, `${target}.js`, path.join(target, "index.js")];
    const hit = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
    if (!hit) {
      bad(`${rel}: require("${m[1]}") finds no file`);
    } else if (!existsExactCase(hit)) {
      bad(`${rel}: require("${m[1]}") has the wrong letter case (works on Windows, FAILS on Render/Linux)`);
    }
  }
}
if (problems.length === 0 || !problems.some((p) => p.includes("require("))) ok(`all ${requireCount} relative requires resolve`);

// ---- summary ---------------------------------------------------------------------------------
console.log("");
if (problems.length === 0) {
  console.log("Everything is in place.");
} else {
  console.log(`${problems.length} problem(s) found. Fix the ones marked PROBLEM, then run this again.`);
  process.exitCode = 1;
}