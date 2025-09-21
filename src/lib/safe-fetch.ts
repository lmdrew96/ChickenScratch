export interface SafeFetchOptions extends RequestInit {
  /**
   * Maximum duration in milliseconds before the request is aborted. Defaults to 8000ms.
   */
  timeoutMs?: number;
  /**
   * Optional list of acceptable HTTP status codes. Defaults to [200, 201, 202, 204].
   */
  allowedStatuses?: number[];
}

export class SafeFetchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SafeFetchError';
  }
}

const DEFAULT_ALLOWED_STATUSES = [200, 201, 202, 204];

export async function safeFetch(input: RequestInfo | URL, options: SafeFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 8000, allowedStatuses = DEFAULT_ALLOWED_STATUSES, signal, ...init } = options;
  const controller = new AbortController();
  const abortListeners: Array<{ target: AbortSignal; handler: () => void }> = [];

  if (signal) {
    if (signal.aborted) {
      throw new SafeFetchError('Fetch aborted before it started.');
    }
    const handler = () => controller.abort(signal.reason);
    signal.addEventListener('abort', handler, { once: true });
    abortListeners.push({ target: signal, handler });
  }

  const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (!allowedStatuses.includes(response.status)) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : response.url;
      throw new SafeFetchError(`Unexpected status ${response.status} received from ${url}.`);
    }
    return response;
  } catch (error) {
    if (error instanceof SafeFetchError) {
      throw error;
    }
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : 'request';
    throw new SafeFetchError(`Failed to fetch ${url}`, { cause: error });
  } finally {
    clearTimeout(timer);
    for (const { target, handler } of abortListeners) {
      target.removeEventListener('abort', handler);
    }
  }
}
