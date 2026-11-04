import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  clean: true,
  banner: {
    js: `import { fileURLToPath as __fileURLToPath } from "node:url";
import { dirname as __pathDirname } from "node:path";
import { createRequire as __createRequire } from "node:module";

var __filename = __fileURLToPath(import.meta.url);
var __dirname = __pathDirname(__filename);
var require = __createRequire(import.meta.url);`,
  },
});
