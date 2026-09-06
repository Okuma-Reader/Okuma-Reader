#!/usr/bin/env node
// @ts-check
/**
 * Lockstep version bump + CHANGELOG for a release.
 *
 * Usage:
 *   npm run release:prep -- 0.0.3
 *   npm run release:prep -- patch|minor|major
 *
 * Then commit, push, tag, and push the tag (see printed next steps).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {{
 *   name: string;
 *   version: string;
 *   dependencies?: Record<string, string>;
 *   peerDependencies?: Record<string, string>;
 *   optionalDependencies?: Record<string, string>;
 *   devDependencies?: Record<string, string>;
 * }} PackageJson
 */

/**
 * @typedef {{ major: number; minor: number; patch: number }} Semver
 */

/** @typedef {"patch" | "minor" | "major"} BumpKind */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = path.join(root, "packages");

const arg = process.argv[2];
if (!arg) {
  console.error(`Usage:
  npm run release:prep -- <version>     # e.g. 0.0.3
  npm run release:prep -- patch|minor|major`);
  process.exit(1);
}

/**
 * @param {string} file
 * @returns {PackageJson}
 */
function readJson(file) {
  return /** @type {PackageJson} */ (JSON.parse(fs.readFileSync(file, "utf8")));
}

/**
 * @param {string} file
 * @param {PackageJson} data
 */
function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

/**
 * @param {string} version
 * @returns {Semver}
 */
function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Expected semver X.Y.Z, got: ${version}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/**
 * @param {string} version
 * @param {BumpKind} kind
 * @returns {string}
 */
function bumpSemver(version, kind) {
  const v = parseSemver(version);
  if (kind === "major") return `${v.major + 1}.0.0`;
  if (kind === "minor") return `${v.major}.${v.minor + 1}.0`;
  if (kind === "patch") return `${v.major}.${v.minor}.${v.patch + 1}`;
  throw new Error(`Unknown bump kind: ${kind}`);
}

/** @param {string} value */
function isBumpKind(value) {
  return value === "patch" || value === "minor" || value === "major";
}

const pkgPaths = fs
  .readdirSync(packagesDir)
  .map((name) => path.join(packagesDir, name, "package.json"))
  .filter((file) => fs.existsSync(file));

if (pkgPaths.length === 0) {
  console.error("No packages found under packages/");
  process.exit(1);
}

const firstPkg = pkgPaths[0];
if (!firstPkg) {
  console.error("No packages found under packages/");
  process.exit(1);
}

const current = readJson(firstPkg).version;
for (const file of pkgPaths) {
  const version = readJson(file).version;
  if (version !== current) {
    console.error(
      `Package versions are not in lockstep (found ${current} and ${version}). Fix that first.`,
    );
    process.exit(1);
  }
}

let next;
if (isBumpKind(arg)) {
  next = bumpSemver(current, arg);
} else {
  next = arg.replace(/^v/, "");
  parseSemver(next);
  if (next === current) {
    console.error(`Already at ${current}.`);
    process.exit(1);
  }
}

/** @type {Array<"dependencies" | "peerDependencies" | "optionalDependencies" | "devDependencies">} */
const depFields = ["dependencies", "peerDependencies", "optionalDependencies", "devDependencies"];

for (const file of pkgPaths) {
  const pkg = readJson(file);
  pkg.version = next;
  for (const field of depFields) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const name of Object.keys(deps)) {
      if (name.startsWith("@okuma-reader/")) deps[name] = next;
    }
  }
  writeJson(file, pkg);
  console.log(`bumped ${pkg.name} → ${next}`);
}

const tag = `v${next}`;
execFileSync("npx", ["git-cliff", "--tag", tag, "-o", "CHANGELOG.md"], {
  cwd: root,
  stdio: "inherit",
});

console.log(`
Prepared ${tag} (${current} → ${next}).

Next:
  git add packages/*/package.json CHANGELOG.md
  git commit -m "chore(release): ${tag}"
  git push origin main
  # after CI is green:
  git tag ${tag} && git push origin ${tag}
`);
