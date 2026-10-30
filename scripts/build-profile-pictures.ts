// Renders the downloadable profile pictures and their page previews in public/profile-pictures from the designs in
// src/lib/profile-pictures.ts. Outputs are committed; run `npm run build:avatars` after changing a design.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PREVIEW_SIZE, PROFILE_PICTURES, pictureFile, previewFile } from "../src/lib/profile-pictures.ts";
import { renderPicture } from "../src/lib/profile-pictures-render.ts";

const target = join(import.meta.dirname, "..", "public", "profile-pictures");
await mkdir(target, { recursive: true });

for (const picture of PROFILE_PICTURES) {
  const files = [
    [pictureFile(picture), await renderPicture(picture)],
    [previewFile(picture), await renderPicture(picture, PREVIEW_SIZE)],
  ] as const;
  for (const [name, data] of files) {
    await writeFile(join(target, name), data);
    console.log(`${name.padEnd(42)} ${String(data.length).padStart(6)} bytes`);
  }
}
