/** Prompt injection patterns */
export const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(your\s+)?(instructions?|rules?|guidelines?)/i,
  /you\s+are\s+now\s+(in\s+)?(DAN|jailbreak|unrestricted)(\s+mode)?/i,
  /pretend\s+you\s+have\s+no\s+(restrictions?|rules?)/i,
  /<\s*system\s*>/i,
  /\[INST\]/i,
  /override\s+(safety|security)\s+(rules?|filters?)/i,
  /act\s+as\s+if\s+you\s+have\s+no\s+limitations/i,
];

/** Data exfiltration patterns */
export const DATA_EXFIL_PATTERNS: RegExp[] = [
  /\bfetch\s*\(/i,
  /\bcurl\s+/i,
  /\baxios\.(get|post)\s*\(/i,
  /discord\.com\/api\/webhooks/i,
  /pastebin\.com/i,
  /\.env\b/i,
  /process\.env/i,
  /fs\.readFileSync?\s*\(/i,
  /readFileSync?\s*\(\s*['"`].*\.env/i,
  /webhook\.site/i,
  /ngrok\.io/i,
];

/** Secret / credential patterns */
export const SECRET_PATTERNS: RegExp[] = [
  /AKIA[0-9A-Z]{16}/,
  /ghp_[a-zA-Z0-9]{20,}/,
  /gho_[a-zA-Z0-9]{20,}/,
  /sk-(?:proj-)?[a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/i,
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
  /xox[baprs]-[0-9a-zA-Z-]+/,
];

/** Dangerous shell command patterns */
export const DANGEROUS_CMD_PATTERNS: RegExp[] = [
  /rm\s+-rf\s+\//,
  /rm\s+-rf\s+~\//,
  /format\s+c:/i,
  /curl\s+[^\n|]*\|\s*(ba)?sh/i,
  /wget\s+[^\n]*\|\s*(ba)?sh/i,
  /:\(\)\s*\{\s*:\|:\s*&\s*\}\s*;/,
  /mkfs\./i,
  /dd\s+if=/i,
];

/** Obfuscation patterns */
export const OBFUSCATION_PATTERNS: RegExp[] = [
  /[A-Za-z0-9+/]{80,}={0,2}/,
  /\\x[0-9a-fA-F]{2}/,
  /\batob\s*\(/i,
  /\beval\s*\(/i,
  /Function\s*\(\s*['"`]/,
];

/** Privilege escalation patterns */
export const PRIVILEGE_PATTERNS: RegExp[] = [
  /\bsudo\s+/i,
  /chmod\s+777/i,
  /chmod\s+\+s/i,
  /\bchown\s+root/i,
  /setuid/i,
  /runas\s+/i,
];

/** Suspicious external URL patterns */
export const EXTERNAL_URL_PATTERNS: RegExp[] = [
  /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
  /https?:\/\/[^\s/]+\.(tk|ml|ga|cf|gq)\//i,
];

/** Allowed URL domains (not flagged) */
export const ALLOWED_DOMAINS: string[] = [
  'github.com',
  'raw.githubusercontent.com',
  'npmjs.com',
  'registry.npmjs.org',
  'skillregistry.dev',
  'docs.cursor.com',
];
