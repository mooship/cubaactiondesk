import { buildMailto, type MailtoResult } from "./mailto.ts";
import { extractPlaceholders, renderTemplate } from "./template.ts";
import { buildWhatsAppShare } from "./whatsapp.ts";

/**
 * Pure logic behind the Action Desk, shared by the server render (no-JS
 * fallback) and the browser script. Everything the visitor types stays here
 * and in their browser: none of it is sent to the server.
 */

const MAX_VALUE_LENGTH = 1000;

/** Prefill values from the query string, for the keys this action defines only. */
export function parseValues(params: URLSearchParams, keys: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = params.get(key)?.trim().slice(0, MAX_VALUE_LENGTH).trim();
    if (value) values[key] = value;
  }
  return values;
}

/** Fills the template. `{link}` comes from the site and cannot be overridden by the sender. */
export function fillTemplate(body: string, values: Record<string, string>, link?: string): string {
  return renderTemplate(body, { ...values, link });
}

export interface SendState {
  email: MailtoResult;
  whatsappUrl: string;
  characters: number;
  /** Placeholders still showing in the text. */
  unfilled: string[];
}

export function computeSend(input: { text: string; to: string[]; subject: string }): SendState {
  return {
    email: buildMailto({ to: input.to, subject: input.subject, body: input.text }),
    whatsappUrl: buildWhatsAppShare(input.text),
    characters: input.text.length,
    unfilled: extractPlaceholders(input.text),
  };
}
