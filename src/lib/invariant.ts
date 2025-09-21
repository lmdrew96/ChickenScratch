export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantError';
  }
}

export function invariant(condition: unknown, message: string | (() => string)): asserts condition {
  if (!condition) {
    const resolvedMessage = typeof message === 'function' ? message() : message;
    throw new InvariantError(resolvedMessage);
  }
}
