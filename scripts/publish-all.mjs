// Publish every card in this repo to the Mafold API (global scope). Each card is
// a project dir with a mafold.card.json; we run `mafold cards publish` per dir.
//   MAFOLD_BOT_TOKEN=<global publisher mb_ token> node scripts/publish-all.mjs
import { readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const base = process.env.MAFOLD_BASE || "https://api.mafold.com";
const token = process.env.MAFOLD_BOT_TOKEN;
if (!token) {
  console.error("set MAFOLD_BOT_TOKEN (the global publisher account's mb_ token)");
  process.exit(1);
}
const dirs = readdirSync(".", { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${d.name}/mafold.card.json`))
  .map((d) => d.name)
  .sort();
console.log(`publishing ${dirs.length} card(s) to ${base} …`);
for (const dir of dirs) {
  console.log(`\n→ ${dir}`);
  execFileSync("mafold", ["--base", base, "--token", token, "cards", "publish", "--dir", dir], { stdio: "inherit" });
}
console.log(`\n✓ published ${dirs.length} card(s)`);
