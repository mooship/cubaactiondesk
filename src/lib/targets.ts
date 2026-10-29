import type { TargetData } from "../content/schemas.ts";

/** A recipient the site can show: a target on its own, or one of its options. */
export interface Contact {
  id: string;
  name: string;
  address: string | null;
  postal: string | null;
  sourceUrl: string | null;
  lastVerified: Date | null;
  note?: string;
}

/** The target's options when it has any, otherwise the target itself. */
export function contactsOf(target: TargetData): Contact[] {
  if (target.options.length > 0) {
    return target.options.map(({ note, ...rest }) => ({ ...rest, ...(note && { note }) }));
  }
  return [
    {
      id: target.id,
      name: target.name,
      address: target.address,
      postal: target.postal,
      sourceUrl: target.sourceUrl,
      lastVerified: target.lastVerified,
    },
  ];
}

/** Why a contact cannot be shown yet. Empty means it is verified. */
export function contactProblems(contact: Contact): string[] {
  const problems: string[] = [];
  const where = contact.address ?? contact.postal;
  if (!where || /\[VERIFY\]/i.test(where)) problems.push("address is unverified");
  if (!contact.sourceUrl) problems.push("source URL missing");
  if (!contact.lastVerified) problems.push("verification date missing");
  return problems;
}

/** Contacts that are safe to show: address, source URL and verification date all present. */
export function verifiedContacts(target: TargetData): Contact[] {
  return contactsOf(target).filter((c) => contactProblems(c).length === 0);
}
