export function isSafeHref(v: string) {
  return /^(\/(?![\/\\])|#|https?:\/\/|mailto:|tel:)/i.test(v.trim());
}
