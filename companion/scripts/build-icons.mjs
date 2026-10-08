import fs from "node:fs/promises";
import sharp from "sharp";
const svg = "node_modules/@phosphor-icons/core/assets/regular/intersect.svg";
await fs.mkdir("assets", { recursive: true });
await sharp(svg).resize(22, 22).png().toFile("assets/trayTemplate.png");
await sharp(svg).resize(44, 44).png().toFile("assets/trayTemplate@2x.png");
await sharp(svg)
  .resize(720, 720)
  .extend({
    top: 152,
    bottom: 152,
    left: 152,
    right: 152,
    background: "#f4f5f1",
  })
  .flatten({ background: "#f4f5f1" })
  .png()
  .toFile("assets/icon.png");
console.log("Built tray icons from Phosphor Intersect (MIT).");

await fs.mkdir("assets/licenses", { recursive: true });
for (const [name, file] of Object.entries({
  "axiom-react": "@optiaxiom/react/LICENSE",
  "axiom-icons": "@optiaxiom/icons/LICENSE",
  "axiom-globals": "@optiaxiom/globals/LICENSE",
  "roboto": "@fontsource-variable/roboto/LICENSE",
  "roboto-condensed": "@fontsource-variable/roboto-condensed/LICENSE",
  "roboto-mono": "@fontsource-variable/roboto-mono/LICENSE",
  "phosphor": "@phosphor-icons/core/LICENSE",
  "react": "react/LICENSE",
  "react-dom": "react-dom/LICENSE",
})) await fs.writeFile(`assets/licenses/${name}.txt`, (await fs.readFile(`node_modules/${file}`, "utf8")).replace(/\r\n/g, "\n"));
