import { getStorage, readDone } from "../lib/done-store.ts";

/** Shows the star on each action card this device has marked done. */
const done = readDone(getStorage());
for (const card of document.querySelectorAll<HTMLElement>("[data-action-card]")) {
  if (done.includes(card.dataset.actionCard ?? "")) {
    card.querySelector<HTMLElement>("[data-done-mark]")?.removeAttribute("hidden");
  }
}
