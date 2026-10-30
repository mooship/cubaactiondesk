/** Side of each download in pixels. Every platform shrinks it, and 1024 covers the largest upload limits. */
export const PICTURE_SIZE = 1024;

/** Side of the preview shown on the page, so the page does not load four full-size pictures. */
export const PREVIEW_SIZE = 256;

const NAVY = "#0B1F4D";
const RED = "#C8102E";
const WHITE = "#FFFFFF";

export interface ProfilePicture {
  id: string;
  /** Short name for the download button. */
  label: string;
  /** What the picture shows, for screen readers. */
  alt: string;
  /** The picture in a 100 x 100 box. Platforms crop to a circle, so the star stays well inside it. */
  svg: string;
}

/** Five-point star path centred on (cx, cy). Inner radius is 40% of the outer radius, as in the logo. */
function starPath(cx: number, cy: number, outer: number): string {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = ((-90 + i * 36) * Math.PI) / 180;
    const r = i % 2 === 0 ? outer : outer * 0.4;
    return `${(cx + r * Math.cos(angle)).toFixed(3)} ${(cy + r * Math.sin(angle)).toFixed(3)}`;
  });
  return `M${points.join("L")}Z`;
}

const frame = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;
const field = (colour: string) => `<rect width="100" height="100" fill="${colour}"/>`;
const star = (colour: string, outer: number) => `<path fill="${colour}" d="${starPath(50, 50, outer)}"/>`;

export const PROFILE_PICTURES: readonly ProfilePicture[] = [
  {
    id: "red",
    label: "Red",
    alt: "A white five-point star on a red background.",
    svg: frame(field(RED) + star(WHITE, 30)),
  },
  {
    id: "navy",
    label: "Navy",
    alt: "A white five-point star on a dark navy background.",
    svg: frame(field(NAVY) + star(WHITE, 30)),
  },
  {
    id: "disc",
    label: "Red disc",
    alt: "A white five-point star on a red disc, on a dark navy background.",
    svg: frame(field(NAVY) + `<circle cx="50" cy="50" r="38" fill="${RED}"/>` + star(WHITE, 25)),
  },
  {
    id: "light",
    label: "Light",
    alt: "A red five-point star on a white background.",
    svg: frame(field(WHITE) + star(RED, 30)),
  },
];

/** File name inside public/profile-pictures. */
export const pictureFile = (picture: ProfilePicture): string => `cuba-action-desk-${picture.id}.png`;

/** File name of the small preview. */
export const previewFile = (picture: ProfilePicture): string => `cuba-action-desk-${picture.id}-preview.png`;

/** Public path of the committed download. */
export const picturePath = (picture: ProfilePicture): string => `/profile-pictures/${pictureFile(picture)}`;

/** Public path of the committed preview. */
export const previewPath = (picture: ProfilePicture): string => `/profile-pictures/${previewFile(picture)}`;
