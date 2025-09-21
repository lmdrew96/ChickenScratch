export type HandledIssueContext = Record<string, unknown>;

export type HandledIssueOptions = {
  reason?: string;
  cause?: unknown;
  context?: HandledIssueContext;
};

function normaliseCause(cause: unknown): Partial<Record<'causeName' | 'causeMessage' | 'causeSummary', unknown>> {
  if (!cause) {
    return {};
  }

  if (cause instanceof Error) {
    const payload: Partial<Record<'causeName' | 'causeMessage', unknown>> = {};
    if (cause.name && cause.name !== 'Error') {
      payload.causeName = cause.name;
    }
    if (cause.message) {
      payload.causeMessage = cause.message;
    }
    return payload;
  }

  if (typeof cause === 'string') {
    return { causeMessage: cause };
  }

  try {
    return { causeSummary: JSON.stringify(cause) };
  } catch {
    return { causeSummary: String(cause) };
  }
}

export function logHandledIssue(scope: string, options: HandledIssueOptions = {}) {
  const { reason, cause, context } = options;
  const payload: Record<string, unknown> = { scope };

  if (reason) {
    payload.reason = reason;
  }

  if (context) {
    for (const [key, value] of Object.entries(context)) {
      if (value === undefined) {
        continue;
      }
      const safeKey = key.toLowerCase().includes('error')
        ? key.replace(/error/gi, 'issue')
        : key;
      payload[safeKey] = value;
    }
  }

  const normalised = normaliseCause(cause);
  for (const [key, value] of Object.entries(normalised)) {
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  console.warn(`[handled-issue] ${scope}`, payload);
}
