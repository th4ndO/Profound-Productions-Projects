/**
 * resilience.ts — retry with exponential backoff, timeouts, and idempotency keys.
 *
 * TEMPLATE: not wired into any app yet. Copy into a project's `lib/` when needed.
 * No dependencies. Works in Node 18+, Vercel Edge/Node runtimes, and browsers
 * (uses fetch, AbortController, and crypto.subtle).
 *
 * Payment finalisation rule of thumb:
 *   1. The idempotency key stops the *provider* from charging/processing twice.
 *   2. A compare-and-set update stops *your database* from finalising twice.
 *   You need both; see `finaliseOnce` at the bottom.
 */

// ---------------------------------------------------------------------------
// Errors

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

/** An HTTP failure that is safe to retry (408, 425, 429, 5xx). */
export class RetryableHttpError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfterMs?: number,
  ) {
    super(`Retryable HTTP ${status}`);
    this.name = 'RetryableHttpError';
  }
}

// ---------------------------------------------------------------------------
// Timeouts

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(signal!.reason);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Runs `fn` with an AbortSignal that fires after `ms`. `fn` must pass the signal to
 * whatever it awaits (e.g. fetch) for the timeout to actually cancel the work.
 */
export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
  parent?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new TimeoutError(ms)), ms);
  const onParentAbort = () => controller.abort(parent!.reason);
  parent?.addEventListener('abort', onParentAbort, { once: true });
  try {
    return await fn(controller.signal);
  } catch (err) {
    // Surface our TimeoutError rather than a generic AbortError.
    if (controller.signal.aborted && controller.signal.reason instanceof TimeoutError) throw controller.signal.reason;
    throw err;
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', onParentAbort);
  }
}

// ---------------------------------------------------------------------------
// Retry with exponential backoff + full jitter

export interface RetryOptions {
  /** Retries after the first attempt. Default 3 (so up to 4 attempts). */
  retries?: number;
  /** First backoff ceiling in ms. Default 250. */
  baseMs?: number;
  /** Maximum backoff in ms. Default 5000. */
  maxMs?: number;
  /** Per-attempt timeout in ms. Default 10000. */
  timeoutMs?: number;
  /** Decide whether an error is worth retrying. Default: timeouts, network errors, RetryableHttpError. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  /** Called before each wait; useful for logging (never log request bodies or keys). */
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
  /** Cancels the whole operation, including waits. */
  signal?: AbortSignal;
}

export function isTransient(err: unknown): boolean {
  if (err instanceof TimeoutError || err instanceof RetryableHttpError) return true;
  // fetch() network failures surface as TypeError in Node, browsers, and Edge.
  return err instanceof TypeError;
}

/** Backoff for attempt n (1-based): random in [0, min(maxMs, baseMs * 2^(n-1))]. */
export function backoffDelay(attempt: number, baseMs = 250, maxMs = 5000, random = Math.random): number {
  const ceiling = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
  return Math.floor(random() * ceiling);
}

export async function retry<T>(
  fn: (attempt: number, signal: AbortSignal) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { retries = 3, baseMs = 250, maxMs = 5000, timeoutMs = 10_000, shouldRetry = isTransient, onRetry, signal } = opts;
  for (let attempt = 1; ; attempt++) {
    try {
      return await withTimeout((s) => fn(attempt, s), timeoutMs, signal);
    } catch (err) {
      if (signal?.aborted || attempt > retries || !shouldRetry(err, attempt)) throw err;
      const hinted = err instanceof RetryableHttpError ? err.retryAfterMs : undefined;
      const delay = hinted !== undefined ? Math.min(hinted, maxMs) : backoffDelay(attempt, baseMs, maxMs);
      onRetry?.(err, attempt, delay);
      await sleep(delay, signal);
    }
  }
}

// ---------------------------------------------------------------------------
// fetch with retry

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

/**
 * fetch() with timeouts and retries on network errors, 408, 425, 429, and 5xx.
 * Other 4xx responses are returned as-is (they won't succeed on retry).
 *
 * A POST/PATCH is only retried when it carries an `Idempotency-Key` header,
 * because retrying a non-idempotent request can duplicate a payment or order.
 */
export async function fetchWithRetry(input: string | URL, init: RequestInit = {}, opts: RetryOptions = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  const retrySafe = SAFE_METHODS.has(method) || headers.has('Idempotency-Key');
  return retry(
    async (_attempt, signal) => {
      const res = await fetch(input, { ...init, headers, signal });
      if (res.status === 408 || res.status === 425 || res.status === 429 || res.status >= 500) {
        // Drain the body so the connection can be reused.
        await res.body?.cancel().catch(() => undefined);
        throw new RetryableHttpError(res.status, parseRetryAfter(res.headers.get('Retry-After')));
      }
      return res;
    },
    { ...opts, retries: retrySafe ? opts.retries : 0 },
  );
}

// ---------------------------------------------------------------------------
// Idempotency keys

/**
 * Deterministic idempotency key: the same scope + parts always give the same key, so a
 * retry after a crash or a double-clicked button reuses it instead of minting a new one.
 *
 *   idempotencyKey('yoco-refund', orderId)            // one refund per order
 *   idempotencyKey('order-finalise', orderId, checkoutId)
 *
 * Never put secrets or personal data in the parts; they're hashed, but keep them boring
 * (ids only). Returns 64 hex chars (SHA-256). Check the payment provider's key length
 * limit and header name in its docs before use [CONFIRM for Yoco].
 */
export async function idempotencyKey(scope: string, ...parts: Array<string | number>): Promise<string> {
  if (!scope) throw new Error('idempotencyKey: scope is required');
  if (parts.length === 0) throw new Error('idempotencyKey: at least one id part is required');
  const data = new TextEncoder().encode([scope, ...parts.map(String)].join('\u001f'));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Finalise a payment exactly once

export interface FinaliseOnceOptions<T> {
  /**
   * Atomically move the order from "pending" to "finalising"/"paid" and return true only
   * if THIS call made the change (compare-and-set). With Supabase:
   *
   *   const { data } = await supabase.from('orders')
   *     .update({ status: 'paid', paid_at: new Date().toISOString() })
   *     .eq('id', orderId).eq('status', 'pending')
   *     .select('id');
   *   return (data?.length ?? 0) === 1;
   *
   * Back it with a unique constraint on the provider's payment/checkout id, and store
   * processed webhook event ids in a table with a unique key so replays are no-ops.
   */
  claim: () => Promise<boolean>;
  /** Side effects that must happen once (emails, stock decrement). Runs only if claim() won. */
  effect: () => Promise<T>;
  /** Optional: undo the claim if the effect fails permanently, so it can be retried later. */
  release?: () => Promise<void>;
}

export type FinaliseResult<T> = { status: 'finalised'; value: T } | { status: 'already-finalised' };

export async function finaliseOnce<T>(opts: FinaliseOnceOptions<T>): Promise<FinaliseResult<T>> {
  const won = await opts.claim();
  if (!won) return { status: 'already-finalised' };
  try {
    return { status: 'finalised', value: await opts.effect() };
  } catch (err) {
    await opts.release?.().catch(() => undefined);
    throw err;
  }
}
