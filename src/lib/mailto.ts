/** Longer mailto URLs fail in some mail apps, so past this we offer Copy instead. */
export const MAILTO_MAX_LENGTH = 1800;

export interface MailtoInput {
  to: string[];
  subject: string;
  body: string;
  maxLength?: number;
}

export interface MailtoResult {
  /** The mailto URL, or null when it is too long to be reliable. */
  url: string | null;
  /** Length of the encoded URL, whether or not it was withheld. */
  length: number;
  tooLong: boolean;
}

function encodeRecipient(address: string): string {
  return encodeURIComponent(address).replaceAll("%40", "@");
}

export function buildMailto({ to, subject, body, maxLength = MAILTO_MAX_LENGTH }: MailtoInput): MailtoResult {
  // RFC 6068: line breaks in the body are CRLF.
  const crlfBody = body.replaceAll(/\r\n|\r|\n/g, "\r\n");
  const url = `mailto:${to.map(encodeRecipient).join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crlfBody)}`;
  const tooLong = url.length > maxLength;
  return { url: tooLong ? null : url, length: url.length, tooLong };
}
