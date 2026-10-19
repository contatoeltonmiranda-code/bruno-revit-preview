// =====================================================================
//  TODO (ELTON / BRUNO): set the REVIT WhatsApp number before launch.
//  International format, digits only, no "+", no spaces.
//  Example for an Irish mobile 087 123 4567  ->  '353871234567'
//  While empty, every CTA opens WhatsApp with the message ready and the
//  visitor picks the contact (wa.me without a number).
// =====================================================================
export const WHATSAPP_NUMBER = '';

// Default message for every general CTA (from the approved copy).
export const DEFAULT_MESSAGE =
  "Hi Bruno, I'd like a quote from REVIT. I'll send some photos of what needs cleaning.";

export function waLink(message = DEFAULT_MESSAGE) {
  const base = WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}
