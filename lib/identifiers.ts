const IDENTIFIER_RE = /^([A-Z][A-Z0-9]{1,4})-(\d+)$/;

export function formatIdentifier(key: string, number: number) {
  return `${key}-${number}`;
}

export function parseIdentifier(
  value: string,
): { key: string; number: number } | null {
  const m = IDENTIFIER_RE.exec(value.trim().toUpperCase());
  if (!m) return null;
  return { key: m[1], number: Number(m[2]) };
}

/** Suggest a 2–5 char uppercase key from a project name, e.g. "Web App" -> "WEB". */
export function suggestProjectKey(name: string) {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  let key = "";
  if (words.length >= 2) key = words.map((w) => w[0]).join("");
  else if (words.length === 1) key = words[0].slice(0, 3);
  key = key.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (key.length < 2) key = (key + "XX").slice(0, 2);
  if (/^[0-9]/.test(key)) key = "P" + key;
  return key.slice(0, 5);
}
