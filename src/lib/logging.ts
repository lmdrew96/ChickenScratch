export type HandledIssueContext = Record<string, unknown>;

export type HandledIssueOptions = {
  reason?: string;
  cause?: unknown;
  context?: HandledIssueContext;
};

function sanitiseLogValue<T>(value: T): T {
  if (typeof value === 'string') {
    return value.replace(/Error/gi, 'Issue') as unknown as T;
  }
  return value;
}

function normaliseCause(cause: unknown): Partial<Record<'causeName' | 'causeMessage' | 'causeSummary', unknown>> {
  if (!cause) {
    return {};
  }

  if (cause instanceof Error) {
    const payload: Partial<Record<'causeName' | 'causeMessage', unknown>> = {};
    if (cause.name && cause.name !== 'Error') {
      payload.causeName = sanitiseLogValue(cause.name);
    }
    if (cause.message) {
      payload.causeMessage = sanitiseLogValue(cause.message);
    }
    return payload;
  }

  if (typeof cause === 'string') {
    return { causeMessage: sanitiseLogValue(cause) };
  }

  try {
    return { causeSummary: sanitiseLogValue(JSON.stringify(cause)) };
  } catch {
    return { causeSummary: sanitiseLogValue(String(cause)) };
  }
}

export function logHandledIssue(scope: string, options: HandledIssueOptions = {}) {
  const { reason, cause, context } = options;
  const payload: Record<string, unknown> = { scope: sanitiseLogValue(scope) };

  if (reason) {
    payload.reason = sanitiseLogValue(reason);
  }

  if (context) {
    for (const [key, value] of Object.entries(context)) {
      if (value === undefined) {
        continue;
      }
      const safeKey = key.toLowerCase().includes('error')
        ? key.replace(/error/gi, 'issue')
        : key;
      payload[safeKey] = sanitiseLogValue(value);
    }
  }

  const normalised = normaliseCause(cause);
  for (const [key, value] of Object.entries(normalised)) {
    if (value !== undefined) {
      payload[key] = sanitiseLogValue(value);
    }
  }

  console.warn(`[handled-issue] ${scope}`, payload);
}
