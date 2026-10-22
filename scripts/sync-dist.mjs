import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const outputPublicDir = path.join(root, ".output", "public");
const distClientDir = path.join(root, "dist", "client");

function copyFolder(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    if (item === "client") continue; // Avoid circular copy
    const s = path.join(src, item);
    const d = path.join(dest, item);
    fs.cpSync(s, d, { recursive: true });
  }
}

// Ensure dist, .output/public, and dist/client are all populated
if (fs.existsSync(distDir)) {
  copyFolder(distDir, outputPublicDir);
  copyFolder(distDir, distClientDir);
  console.log("Synced dist assets to .output/public and dist/client");
} else if (fs.existsSync(outputPublicDir)) {
  copyFolder(outputPublicDir, distDir);
  copyFolder(outputPublicDir, distClientDir);
  console.log("Synced .output/public assets to dist and dist/client");
}
