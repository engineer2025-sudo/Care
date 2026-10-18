/** One reviewed SOS message. No server, no delivery claim, and nothing sent without a tap. */
export const SOS_OPENING = 'CareSphere SOS: I am requesting help. Please check in now.';

export function composeSos(location) {
  if (!location) return SOS_OPENING;
  const stamp = location.recordedAt ? `Location recorded at ${location.recordedAt}` : 'Location recorded';
  return `${SOS_OPENING} ${stamp}: https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
}

export function sosSmsHref(phone, message) {
  return `sms:${phone}?body=${encodeURIComponent(message)}`;
}
