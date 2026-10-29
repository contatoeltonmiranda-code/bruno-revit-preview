// REVIT WhatsApp (Bruno, 2026-10-29): +353 83 343 2008
export const WHATSAPP_NUMBER = '353833432008';

// Default message for every general CTA (from the approved copy).
export const DEFAULT_MESSAGE =
  "Hi Bruno, I'd like a quote from REVIT. I'll send some photos of what needs cleaning.";

export function waLink(message = DEFAULT_MESSAGE) {
  const base = WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}
