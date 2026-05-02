/**
 * sanitizePaths — Abstracts backend implementation details from user-facing output.
 *
 * Replaces raw server paths like /home/ubuntu/project-name/... with cleaner
 * relative paths like ~/project-name/... so users don't see infrastructure details.
 */

const PATH_PATTERNS: [RegExp, string][] = [
  // /home/ubuntu/manus-next-app/ → ~/
  [/\/home\/ubuntu\/manus-next-app\//g, "~/"],
  // /home/ubuntu/ → ~/
  [/\/home\/ubuntu\//g, "~/"],
  // /tmp/ paths → /tmp/ (keep as-is, these are fine)
  // /root/ → ~/
  [/\/root\//g, "~/"],
  // /var/www/ → ~/www/
  [/\/var\/www\//g, "~/www/"],
];

export function sanitizePaths(text: string): string {
  if (!text) return text;
  let result = text;
  for (const [pattern, replacement] of PATH_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export default sanitizePaths;
