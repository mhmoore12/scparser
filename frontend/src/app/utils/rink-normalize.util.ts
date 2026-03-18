const PREFIX_RULES: Array<{ pattern: RegExp; normalized: string }> = [
  { pattern: /^eu\b|^euless\b/, normalized: 'Euless' },
  { pattern: /^fb\b|^farmers\b|^farmers branch\b/, normalized: 'Farmers Branch' },
  { pattern: /^ma\b|^mansfield\b/, normalized: 'Mansfield' },
  { pattern: /^mk\b|^mckinney\b/, normalized: 'McKinney' },
  { pattern: /^nl\b|^north\b|^northlake\b/, normalized: 'Northlake' },
  { pattern: /^pl\b|^plano\b/, normalized: 'Plano' },
  { pattern: /^rc\b|^richardson\b/, normalized: 'Richardson' },
  { pattern: /^fr\b|^frisco\b/, normalized: 'Frisco' },
];

export function normalizeRink(input: string | null | undefined): string {
  const raw = (input ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) {
    return 'Unassigned';
  }

  const lower = raw.toLowerCase();

  if (lower.includes('comerica center frisco')) {
    return 'Frisco';
  }
  if (lower.includes('zubov') || lower.includes('lehtinen')) {
    return 'Euless';
  }

  const head = lower.split('-')[0].trim();
  for (const rule of PREFIX_RULES) {
    if (rule.pattern.test(head) || rule.pattern.test(lower)) {
      return rule.normalized;
    }
  }

  return raw;
}
