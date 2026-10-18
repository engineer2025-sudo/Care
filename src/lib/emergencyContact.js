/** One optional person the user can contact themselves. Nothing is sent automatically. */
export const PHONE_MAX_DIGITS = 24;
export const NAME_MAX = 40;

export function cleanPhone(raw) {
  const text = String(raw ?? '').trim();
  const plus = text.startsWith('+');
  const digits = text.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS);
  return (plus && digits ? '+' : '') + digits;
}

export function cleanName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

export function usableContact(name, phone) {
  const clean = cleanPhone(phone);
  return cleanName(name).length > 0 && clean.replace(/\D/g, '').length >= 7;
}

/** Opens the device's messaging app on a draft. The person still taps Send. */
export function smsDraftLink(phone, message) {
  return `sms:${cleanPhone(phone)}?body=${encodeURIComponent(message)}`;
}

export function callLink(phone) {
  return `tel:${cleanPhone(phone)}`;
}
