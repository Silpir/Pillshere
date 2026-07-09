import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const webDir = "dist/client";
const assetsDir = join(webDir, "assets");

if (!existsSync(assetsDir)) {
  throw new Error("Run `bun run build` before generating the Capacitor web shell.");
}

const assets = readdirSync(assetsDir);
const entry = assets.find((file) => /^index-[\w-]+\.js$/.test(file));
const stylesheet = assets.find((file) => /^styles-[\w-]+\.css$/.test(file));

if (!entry) {
  throw new Error("Could not find the TanStack client entry in dist/client/assets.");
}

const cssLink = stylesheet
  ? `    <link rel="stylesheet" href="/assets/${stylesheet}" />\n`
  : "";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pillshere — Medication reminders</title>
    <meta name="description" content="Lightweight medication reminder & adherence tracker with pill supply and refill alerts." />
${cssLink}    <script>
      (function(){try{var t=localStorage.getItem('pillshere-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/${entry}"></script>
  </body>
</html>
`;

writeFileSync(join(webDir, "index.html"), html);
console.log(`Generated ${webDir}/index.html for Capacitor.`);