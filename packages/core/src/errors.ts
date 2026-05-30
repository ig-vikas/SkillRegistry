/** Base error for all SkillRegistry operations */
export class SkillRegistryError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SkillRegistryError';
    this.code = code;
  }
}

/** SKILL.md parse failure */
export class SkillParseError extends SkillRegistryError {}

/** SKILL.md syntax parse failure */
export class ParseError extends SkillParseError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('PARSE_ERROR', message, options);
    this.name = 'ParseError';
  }
}

/** Schema or frontmatter validation failure */
export class ValidationError extends SkillParseError {
  constructor(message: string, options?: { cause?: unknown }) {
    super('VALIDATION_ERROR', message, options);
    this.name = 'ValidationError';
  }
}

/** Resource not found */
export class NotFoundError extends SkillRegistryError {
  constructor(message: string) {
    super('NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

/** Security scan blocked installation */
export class SecurityBlockedError extends SkillRegistryError {
  readonly report: { score: number; issues: { code: string; severity: string }[] };

  constructor(
    message: string,
    report: { score: number; issues: { code: string; severity: string }[] },
  ) {
    super('SECURITY_BLOCKED', message);
    this.name = 'SecurityBlockedError';
    this.report = report;
  }
}

/** Version mismatch or invalid semver */
export class VersionMismatchError extends SkillRegistryError {
  constructor(message: string) {
    super('VERSION_MISMATCH', message);
    this.name = 'VersionMismatchError';
  }
}
