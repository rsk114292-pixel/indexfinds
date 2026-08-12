export const WHATSAPP_NUMBER = '+852 67676067';
const WHATSAPP_NUMBER_DIGITS = '85267676067';

export function buildWhatsAppHelpUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER_DIGITS}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_HELP_URL = buildWhatsAppHelpUrl(
  'Hello IndexFinds, I need help buying from China.',
);
export const TELEGRAM_URL = 'https://t.me/repindexfinds';
