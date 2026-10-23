const SUFFIXES = new Set(["ltd", "limited", "inc", "incorporated", "co", "corp", "corporation", "llc", "fze", "gmbh", "kk", "pte", "pty", "plc", "as"]);

/** Lowercase, strip punctuation/diacritics and trailing legal-form suffixes. */
export function normalizeName(s: string): string {
  const tokens = s.toLowerCase().normalize("NFKD").replace(/\./g, "").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  while (tokens.length > 1 && SUFFIXES.has(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(" ");
}
/** Alphanumeric-only key, used for duplicate detection of descriptions. */
export const alnumKey = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}
/** 1 = identical, 0 = completely different. */
export function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
}
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}
