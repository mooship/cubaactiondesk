/** Opens WhatsApp's own share sheet. The text never touches our server. */
export function buildWhatsAppShare(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
