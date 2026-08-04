import { readFileSync, writeFileSync } from "fs";

const root = new URL("../../", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const changelog = readFileSync(new URL("CHANGELOG.md", root), "utf8");

const version = pkg.version;
const rx = new RegExp(`## \\[${version}\\][\\s\\S]*?\\n([\\s\\S]*?)(?=\\n## \\[|\\s*$)`);
const match = changelog.match(rx);

if (!match) {
  console.error(`No CHANGELOG section found for version ${version}`);
  process.exit(1);
}

writeFileSync(new URL("notes.md", root), match[1].trim() + "\n");
