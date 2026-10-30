import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  PICTURE_SIZE,
  PREVIEW_SIZE,
  PROFILE_PICTURES,
  pictureFile,
  picturePath,
  previewFile,
  previewPath,
} from "../../src/lib/profile-pictures.ts";
import { renderPicture } from "../../src/lib/profile-pictures-render.ts";

const publicDir = join(import.meta.dirname, "..", "..", "public");
const raw = (input: Buffer | string) => sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

describe("profile pictures", () => {
  it("lists each picture once, with words for the alt text", () => {
    const ids = PROFILE_PICTURES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(3);
    for (const picture of PROFILE_PICTURES) {
      expect(picture.alt.length).toBeGreaterThan(10);
      expect(picturePath(picture)).toBe(`/profile-pictures/${pictureFile(picture)}`);
      expect(previewPath(picture)).toBe(`/profile-pictures/${previewFile(picture)}`);
    }
  });

  const files = PROFILE_PICTURES.flatMap((picture) => [
    { picture, name: pictureFile(picture), size: PICTURE_SIZE },
    { picture, name: previewFile(picture), size: PREVIEW_SIZE },
  ]);

  it.each(files)("keeps the committed $name in step with its design", async ({ picture, name, size }) => {
    const committed = await raw(readFileSync(join(publicDir, "profile-pictures", name)));
    const drawn = await raw(await renderPicture(picture, size));
    expect(committed.info.width).toBe(size);
    expect(committed.info.height).toBe(size);
    expect(committed.data.equals(drawn.data), "run npm run build:avatars and commit the result").toBe(true);
  });

  it.each(PROFILE_PICTURES)(
    "leaves the $id corners clear of the star, so a circle crop loses nothing",
    async (picture) => {
      // Every platform crops to a circle, so anything outside the inscribed circle is lost. The star must sit
      // well inside it: check that the pixels in a ring near the edge are all the background colour.
      const { data, info } = await raw(await renderPicture(picture));
      const centre = info.width / 2;
      const edge = (x: number, y: number) => data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4);
      const background = edge(2, 2);
      for (let angle = 0; angle < 360; angle += 5) {
        const x = Math.round(centre + Math.cos((angle * Math.PI) / 180) * centre * 0.92);
        const y = Math.round(centre + Math.sin((angle * Math.PI) / 180) * centre * 0.92);
        // The disc variant has a red disc out to 76% of the width; its ring at 92% is still the navy field.
        expect(edge(Math.min(x, info.width - 1), Math.min(y, info.height - 1)).equals(background)).toBe(true);
      }
    },
  );
});
