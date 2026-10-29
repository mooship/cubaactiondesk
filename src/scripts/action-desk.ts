import { computeSend, fillTemplate } from "../lib/action-desk.ts";
import { addDone, getStorage, nextAction, readDone } from "../lib/done-store.ts";
import type { Contact } from "../lib/targets.ts";
import { peopleCount } from "../lib/format.ts";

/** How long to wait for the counter before showing a placeholder instead. */
const SLOW_MS = 150;

/**
 * Enhances the server-rendered Action Desk. Everything works without this
 * script (the form refreshes the message, Email and WhatsApp are plain links);
 * this adds live updates, Copy, Print and "Mark as done". The only request it
 * makes is the bodiless counter POST. Nothing the visitor writes leaves the page.
 */

interface Suggestion {
  slug: string;
  title: string;
}

const root = document.querySelector<HTMLElement>("[data-desk]");
if (root) init(root);

function init(root: HTMLElement): void {
  type Field = HTMLInputElement | HTMLTextAreaElement;
  const one = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const message = one<HTMLTextAreaElement>("[data-message]")!;
  const fields = [...root.querySelectorAll<Field>("[data-key]")];
  // TypeScript 7's DOM types do not let HTMLSelectElement satisfy a generic Element constraint, so cast here.
  const contactSelect = root.querySelector("[data-contact]") as unknown as HTMLSelectElement | null;
  const count = one("[data-count]")!;
  const unfilled = one("[data-unfilled]")!;
  const unfilledList = one("[data-unfilled-list]")!;
  const editedNote = one("[data-edited]")!;
  const emailItem = one("[data-email-item]");
  const email = one<HTMLAnchorElement>("[data-email]");
  const emailNote = one("[data-email-note]");
  const whatsapp = one<HTMLAnchorElement>("[data-whatsapp]");
  const copyButton = one<HTMLButtonElement>("[data-copy]")!;
  const copyLabel = one("[data-copy-label]")!;
  const printButton = one<HTMLButtonElement>("[data-print-button]");
  const printBox = one("[data-print]")!;
  const doneButton = one<HTMLButtonElement>("[data-done]")!;
  const doneLabel = one("[data-done-label]")!;
  const total = one("[data-total]")!;
  const totalText = one("[data-total-text]")!;
  const nextBox = one("[data-next-box]")!;
  const status = one("[data-status]")!;

  const slug = root.dataset.slug ?? "";
  const template = root.dataset.template ?? "";
  const subject = root.dataset.subject ?? "";
  const contacts: Pick<Contact, "id" | "address">[] = JSON.parse(root.dataset.contacts ?? "[]");
  const others: Suggestion[] = JSON.parse(root.dataset.next ?? "[]");

  let lastAuto = message.value;
  let wasTooLong = emailItem?.hidden ?? false;
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  // Announced politely, and only when something changes, never on every keystroke.
  const say = (text: string) => {
    status.textContent = text;
  };
  const values = () => Object.fromEntries(fields.map((f) => [f.dataset.key ?? "", f.value]));
  const fromTemplate = () => fillTemplate(template, values());

  function refresh(): void {
    const contact = contacts.find((c) => c.id === contactSelect?.value) ?? contacts[0];
    const state = computeSend({ text: message.value, to: contact?.address ? [contact.address] : [], subject });

    count.textContent = `${state.characters} characters`;
    unfilledList.textContent = state.unfilled.map((key) => `{${key}}`).join(", ");
    unfilled.hidden = state.unfilled.length === 0;
    printBox.textContent = message.value;
    whatsapp?.setAttribute("href", state.whatsappUrl);

    if (!(emailItem && email && emailNote)) {
      return;
    }

    emailItem.hidden = state.email.tooLong;
    emailNote.hidden = !state.email.tooLong;
    email.href = state.email.url ?? "#";
    if (state.email.tooLong === wasTooLong) {
      return;
    }

    wasTooLong = state.email.tooLong;
    say(
      state.email.tooLong
        ? "This message is now too long for the email button. Use Copy message instead."
        : "The email button is available again.",
    );
  }

  // JavaScript is running: swap the no-JS controls for the live ones.
  for (const el of root.querySelectorAll<HTMLElement>("[data-nojs-only]")) el.hidden = true;
  for (const el of root.querySelectorAll<HTMLElement>("[data-js-only]")) el.hidden = false;
  root.querySelector("form")?.addEventListener("submit", (event) => event.preventDefault());

  for (const field of fields) {
    field.addEventListener("input", () => {
      if (message.value === lastAuto) {
        lastAuto = message.value = fromTemplate();
      } else {
        editedNote.hidden = false;
      }
      refresh();
    });
  }
  contactSelect?.addEventListener("change", refresh);
  message.addEventListener("input", () => {
    editedNote.hidden = message.value === lastAuto;
    refresh();
  });
  one("[data-reset]")?.addEventListener("click", () => {
    lastAuto = message.value = fromTemplate();
    editedNote.hidden = true;
    refresh();
  });

  copyButton.addEventListener("click", async () => {
    const copied = await copyText(message);
    clearTimeout(copyTimer);
    if (copied) {
      copyLabel.textContent = "Message copied";
      say("Message copied");
      copyTimer = setTimeout(() => (copyLabel.textContent = "Copy message"), 3000);
    } else {
      message.select();
      say("Could not copy automatically. The message is selected: copy it by hand.");
    }
  });

  printButton?.addEventListener("click", () => print());
  addEventListener("beforeprint", () => {
    printBox.textContent = message.value;
  });

  function showDone(): void {
    doneButton.dataset.state = "done";
    doneButton.setAttribute("aria-pressed", "true");
    doneLabel.textContent = "Done. Thank you.";
    const next = nextAction(readDone(getStorage()), others, slug);
    nextBox.hidden = false;
    if (next) {
      const link = document.createElement("a");
      link.href = `/act/${next.slug}`;
      link.textContent = next.title;
      nextBox.replaceChildren("Next: ", link);
    } else {
      nextBox.textContent = "You have done every action here. Thank you.";
    }
  }

  if (readDone(getStorage()).includes(slug)) showDone();
  doneButton.addEventListener("click", async () => {
    if (doneButton.dataset.state === "done") return;
    addDone(getStorage(), slug);
    showDone();
    say("Marked as done.");
    // A fast answer should not flash a placeholder, so it only appears when the server is slow.
    const before = { text: totalText.textContent, hidden: total.hidden };
    const slow = setTimeout(() => {
      totalText.textContent = "Counting…";
      totalText.classList.add("skeleton", "skeleton-line");
      total.setAttribute("aria-busy", "true");
      total.hidden = false;
    }, SLOW_MS);
    try {
      const res = await fetch(`/api/actions/${slug}/taken`, { method: "POST", keepalive: true });
      if (!res.ok) return;
      const body: { count?: number } = await res.json();
      if (typeof body.count === "number") {
        totalText.textContent = `${peopleCount(body.count)} took this action.`;
        total.hidden = false;
      }
    } catch {
      // Offline or blocked: it is still marked done on this device.
    } finally {
      clearTimeout(slow);
      totalText.classList.remove("skeleton", "skeleton-line");
      total.removeAttribute("aria-busy");
      if (totalText.textContent === "Counting…") {
        totalText.textContent = before.text;
        total.hidden = before.hidden;
      }
    }
  });

  refresh();
}

async function copyText(source: HTMLTextAreaElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(source.value);
    return true;
  } catch {
    // Older WebViews and non-secure contexts: fall back to selecting and copying.
    source.select();
    return document.execCommand("copy");
  }
}
