/**
 * The shape of every id and slug on the site: content file names and the action slug the counter API accepts.
 * Kept free of zod so the Worker does not pull it in.
 */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 80;

export const isSlug = (value: string): boolean => value.length <= SLUG_MAX_LENGTH && SLUG.test(value);
