import { access, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import YAML from "yaml";

const root = resolve(import.meta.dirname, "..");
const designPath = resolve(root, "DESIGN.md");
const mapPath = resolve(root, "implementation-map.yaml");
const startMarker = "<!-- implementation-map:start -->";
const endMarker = "<!-- implementation-map:end -->";

function designLink(reference) {
  const anchor = reference.replace(/^DESIGN\.md/, "");
  return `[${anchor}](${anchor})`;
}

function renderTraceability(group, requirement, verificationById) {
  const parts = [];
  const designRefs = [...(group.design_refs ?? []), ...(requirement.design_refs ?? [])];
  if (designRefs.length) parts.push(`Design: ${[...new Set(designRefs)].map(designLink).join(", ")}`);
  if (requirement.plans?.length) parts.push(`Plans: ${requirement.plans.map((path) => `\`${path}\``).join(", ")}`);
  if (requirement.verification?.length) {
    parts.push(`Verification: ${requirement.verification.map((id) => `\`${verificationById.get(id)?.command ?? id}\``).join(", ")}`);
  }
  return parts.join("; ");
}

function renderMap(map) {
  const body = ["## Implementation Map", "", "> Generated from `implementation-map.yaml`. Do not edit this section directly; run `pnpm map:generate`.", "", map.preamble];
  const verificationById = new Map(map.verification_catalog.map((entry) => [entry.id, entry]));
  body.push("", "### Automated verification catalog", "", "| ID | Kind | Command | Executable files |", "| --- | --- | --- | --- |");
  for (const entry of map.verification_catalog) {
    body.push(`| ${entry.id} | ${entry.kind} | \`${entry.command}\` | ${entry.test_files.map((path) => `\`${path}\``).join("; ")} |`);
  }
  for (const group of map.groups) {
    const columns = [...group.columns, "Traceability"];
    body.push("", `### ${group.title}`, "", `| ${columns.join(" | ")} |`, `| ${columns.map(() => "---").join(" | ")} |`);
    for (const requirement of group.requirements) {
      body.push(`| ${[...group.columns.map((column) => requirement[column]), renderTraceability(group, requirement, verificationById)].join(" | ")} |`);
    }
  }
  return body.join("\n");
}

function markdownAnchors(markdown) {
  return new Set(
    [...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map(([, heading]) =>
      heading
        .trim()
        .toLowerCase()
        .replace(/[`*_~]/g, "")
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-"),
    ),
  );
}

async function filesMatching(directory, pattern) {
  const matches = [];
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    if (entry.isDirectory() && new Set([".git", ".next", "node_modules", "dist"]).has(entry.name)) continue;
    const relative = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) matches.push(...(await filesMatching(relative, pattern)));
    else if (pattern.test(relative)) matches.push(relative);
  }
  return matches;
}

async function validate(map, markdown) {
  const errors = [];
  const ids = new Set();
  const allowedScopes = new Set(["product-behavior", "product-presentation", "quality-assurance", "delivery"]);
  const allowedCoverage = new Set(["Implemented", "Partial", "Planned", "Deferred"]);
  if (map.version !== 2) errors.push("version must be 2");
  if (!Array.isArray(map.groups) || map.groups.length === 0) errors.push("groups must be a non-empty array");
  if (!map.governance?.authority_order?.length || !map.governance?.change_classifications?.length || !map.governance?.conflict_policy) {
    errors.push("governance must define authority_order, change_classifications, and conflict_policy");
  }

  const designAnchors = markdownAnchors(markdown.slice(0, markdown.indexOf(startMarker)));
  const verificationById = new Map();
  const catalogedTests = new Set();
  for (const entry of map.verification_catalog ?? []) {
    if (!entry.id || verificationById.has(entry.id)) errors.push(`duplicate or missing verification catalog ID: ${entry.id ?? "<missing>"}`);
    verificationById.set(entry.id, entry);
    if (!entry.kind || !entry.command || !Array.isArray(entry.test_files) || entry.test_files.length === 0) errors.push(`${entry.id ?? "<missing>"} has an incomplete verification catalog entry`);
    const packageScript = /^pnpm ([a-zA-Z0-9:_-]+)$/.exec(entry.command)?.[1];
    if (!packageScript) errors.push(`${entry.id ?? "<missing>"} command must reference one pnpm script`);
    for (const path of entry.test_files ?? []) {
      if (path.startsWith("/") || path.split("/").includes("..") || !(/\.test\.tsx?$/.test(path) || /^supabase\/tests\/.+\.sql$/.test(path))) {
        errors.push(`${entry.id} has invalid test path: ${path}`);
      }
      catalogedTests.add(path);
      try { await access(resolve(root, path)); } catch { errors.push(`${entry.id} references missing test file: ${path}`); }
    }
  }

  for (const group of map.groups ?? []) {
    if (!group.title || !Array.isArray(group.columns) || !Array.isArray(group.requirements)) errors.push("each group needs title, columns, and requirements");
    if (!allowedScopes.has(group.scope)) errors.push(`${group.title ?? "<missing>"} has invalid scope: ${group.scope ?? "<missing>"}`);
    if (!Array.isArray(group.design_refs) || group.design_refs.length === 0) errors.push(`${group.title ?? "<missing>"} needs design_refs`);
    for (const reference of group.design_refs ?? []) {
      const match = /^DESIGN\.md#(.+)$/.exec(reference);
      if (!match || !designAnchors.has(match?.[1])) errors.push(`${group.title} has invalid design reference: ${reference}`);
    }
    for (const requirement of group.requirements ?? []) {
      const id = requirement.ID;
      if (!id || !/^[A-Z][A-Z0-9]*-\d{2}$/.test(id)) errors.push(`invalid requirement ID: ${id ?? "<missing>"}`);
      if (ids.has(id)) errors.push(`duplicate requirement ID: ${id}`);
      ids.add(id);
      for (const column of group.columns ?? []) {
        if (typeof requirement[column] !== "string" || requirement[column].trim() === "") errors.push(`${id ?? "<missing>"} is missing ${column}`);
      }
      if (!allowedCoverage.has(requirement.Coverage)) errors.push(`${id ?? "<missing>"} has invalid Coverage: ${requirement.Coverage ?? "<missing>"}`);
      for (const reference of requirement.design_refs ?? []) {
        const match = /^DESIGN\.md#(.+)$/.exec(reference);
        if (!match || !designAnchors.has(match?.[1])) errors.push(`${id} has invalid design reference: ${reference}`);
      }
      for (const path of requirement.plans ?? []) {
        if (!path.startsWith("plans/") || path.split("/").includes("..") || !path.endsWith(".md")) errors.push(`${id} has invalid plan path: ${path}`);
        try { await access(resolve(root, path)); } catch { errors.push(`${id} references missing plan: ${path}`); }
      }
      for (const verificationId of requirement.verification ?? []) {
        if (!verificationById.has(verificationId)) errors.push(`${id} references unknown verification: ${verificationId}`);
      }
      const describedPlans = group.columns.flatMap((column) => [...requirement[column].matchAll(/`(plans\/[^`]+\.md)`/g)].map((match) => match[1]));
      for (const path of describedPlans) if (!requirement.plans?.includes(path)) errors.push(`${id} mentions an unstructured plan reference: ${path}`);
    }
  }

  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  for (const entry of verificationById.values()) {
    const script = /^pnpm ([a-zA-Z0-9:_-]+)$/.exec(entry.command)?.[1];
    if (script && !packageJson.scripts?.[script]) errors.push(`${entry.id} references missing package script: ${script}`);
  }
  const unitEntry = verificationById.get("unit-vitest");
  if (packageJson.scripts?.test?.includes("vitest")) {
    if (!unitEntry || unitEntry.runner !== "vitest") errors.push("package.json uses Vitest but unit-vitest is not registered with runner: vitest");
    if (!packageJson.devDependencies?.vitest && !packageJson.dependencies?.vitest) errors.push("the Vitest test script has no Vitest dependency");
    const qa03 = map.groups.flatMap((group) => group.requirements).find((requirement) => requirement.ID === "QA-03");
    if (!qa03?.verification?.includes("unit-vitest") || qa03.Coverage === "Planned" || /\bNone\b/.test(qa03["Current implementation"] ?? "")) {
      errors.push("QA-03 must reference unit-vitest and describe existing coverage when Vitest is configured");
    }
  }
  const discoveredTests = await filesMatching("", /\.test\.tsx?$/);
  for (const path of discoveredTests) if (!catalogedTests.has(path)) errors.push(`uncataloged unit test file: ${path}`);
  const referencedPlans = new Set(map.groups.flatMap((group) => group.requirements.flatMap((requirement) => requirement.plans ?? [])));
  const discoveredPlans = (await filesMatching("plans", /\.md$/)).filter((path) => path !== "plans/README.md");
  for (const path of discoveredPlans) if (!referencedPlans.has(path)) errors.push(`unmapped requirement plan: ${path}`);
  if (/There is currently no automated test suite/i.test(map.preamble)) errors.push("preamble contains a volatile automated-test claim; use the verification catalog");
  if (errors.length) throw new Error(errors.join("\n"));
  return ids.size;
}

async function loadMap() {
  return YAML.parse(await readFile(mapPath, "utf8"));
}

async function replaceGeneratedSection(markdown, rendered) {
  const markedStart = markdown.indexOf(startMarker);
  const markedEnd = markdown.indexOf(endMarker);
  if (markedStart >= 0 && markedEnd > markedStart) {
    return `${markdown.slice(0, markedStart)}${startMarker}\n${rendered}\n${endMarker}${markdown.slice(markedEnd + endMarker.length)}`;
  }
  const sectionStart = markdown.indexOf("## Implementation Map");
  const sectionEnd = markdown.indexOf("\n## Decisions Log", sectionStart);
  if (sectionStart < 0 || sectionEnd < 0) throw new Error("Implementation Map section not found");
  return `${markdown.slice(0, sectionStart)}${startMarker}\n${rendered}\n${endMarker}\n${markdown.slice(sectionEnd + 1)}`;
}

const command = process.argv[2] ?? "validate";
const markdown = await readFile(designPath, "utf8");

const map = await loadMap();
const count = await validate(map, markdown);
const rendered = renderMap(map);
const expectedDesign = await replaceGeneratedSection(markdown, rendered);
if (command === "generate") {
  await writeFile(designPath, expectedDesign, "utf8");
  process.stdout.write(`Generated DESIGN.md map for ${count} requirements\n`);
} else if (command === "validate") {
  if (expectedDesign !== markdown) throw new Error("DESIGN.md implementation map is stale; run pnpm map:generate");
  process.stdout.write(`Validated ${count} mapped requirements\n`);
} else {
  throw new Error(`Unknown command: ${command}`);
}
