import sharp from "sharp";
import { PICTURE_SIZE, type ProfilePicture } from "./profile-pictures.ts";

// Kept apart from profile-pictures.ts, which the page imports: sharp is a native module and must not reach the Worker.

/** The picture as a PNG buffer. Used by `npm run build:avatars` and by the test that checks the committed files. */
export const renderPicture = (picture: ProfilePicture, size = PICTURE_SIZE): Promise<Buffer> =>
  sharp(Buffer.from(picture.svg), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
