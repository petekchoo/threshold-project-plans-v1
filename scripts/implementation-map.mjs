import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import YAML from "yaml";

const root = resolve(import.meta.dirname, "..");
const designPath = resolve(root, "DESIGN.md");
const mapPath = resolve(root, "implementation-map.yaml");
const startMarker = "<!-- implementation-map:start -->";
const endMarker = "<!-- implementation-map:end -->";

function renderMap(map) {
  const body = ["## Implementation Map", "", "> Generated from `implementation-map.yaml`. Do not edit this section directly; run `pnpm map:generate`.", "", map.preamble];
  for (const group of map.groups) {
    body.push("", `### ${group.title}`, "", `| ${group.columns.join(" | ")} |`, `| ${group.columns.map(() => "---").join(" | ")} |`);
    for (const requirement of group.requirements) {
      body.push(`| ${group.columns.map((column) => requirement[column]).join(" | ")} |`);
    }
  }
  return body.join("\n");
}

function validate(map) {
  const errors = [];
  const ids = new Set();
  if (map.version !== 1) errors.push("version must be 1");
  if (!Array.isArray(map.groups) || map.groups.length === 0) errors.push("groups must be a non-empty array");

  for (const group of map.groups ?? []) {
    if (!group.title || !Array.isArray(group.columns) || !Array.isArray(group.requirements)) errors.push("each group needs title, columns, and requirements");
    for (const requirement of group.requirements ?? []) {
      const id = requirement.ID;
      if (!id || !/^[A-Z][A-Z0-9]*-\d{2}$/.test(id)) errors.push(`invalid requirement ID: ${id ?? "<missing>"}`);
      if (ids.has(id)) errors.push(`duplicate requirement ID: ${id}`);
      ids.add(id);
      for (const column of group.columns ?? []) {
        if (typeof requirement[column] !== "string" || requirement[column].trim() === "") errors.push(`${id ?? "<missing>"} is missing ${column}`);
      }
    }
  }
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
const count = validate(map);
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
