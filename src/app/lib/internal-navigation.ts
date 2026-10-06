const INTERNAL_ORIGIN = "https://azubi-lab.invalid";
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function getSafeInternalNavigationTarget(value: unknown, fallback: string) {
  if (typeof value !== "string" || !isSafeInternalNavigationTarget(value)) return fallback;
  const target = new URL(value, INTERNAL_ORIGIN);
  return `${target.pathname}${target.search}${target.hash}`;
}

export function isSafeInternalNavigationTarget(value: unknown): value is string {
  if (typeof value !== "string"
    || value.length < 1
    || value.length > 500
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
    || CONTROL_CHARACTERS.test(value)
    || hasEncodedPathBypass(value)) return false;

  try {
    const target = new URL(value, INTERNAL_ORIGIN);
    return target.origin === INTERNAL_ORIGIN
      && !target.username
      && !target.password;
  } catch {
    return false;
  }
}

function hasEncodedPathBypass(value: string) {
  let path = value.split(/[?#]/, 1)[0];
  for (let index = 0; index < 3; index += 1) {
    try {
      const decoded = decodeURIComponent(path);
      if (decoded === path) return false;
      if (decoded.startsWith("//") || decoded.includes("\\") || CONTROL_CHARACTERS.test(decoded)) {
        return true;
      }
      path = decoded;
    } catch {
      return true;
    }
  }
  return path.startsWith("//") || path.includes("\\") || CONTROL_CHARACTERS.test(path);
}
