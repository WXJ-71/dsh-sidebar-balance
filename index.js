/**
 * Host half of the sidebar balance bundle.
 *
 * The client renders DeepSeek state through the built-in account Remote, but
 * the Moonshot (moonshotai-cn) balance sits behind an API key the page must
 * never see, so the Host owns one small route: it reads the key through the
 * credential seam per request and answers the page over the same origin, with
 * the same browser-session trust check every other local JSON route uses.
 *
 * Every tunable is a Config field, so a profile patch layer — which survives
 * package upgrades — can retarget the endpoint or the credential reference
 * without editing this file.
 */

import Schema from '@deepseek-ai/schemastery';

/** Same-origin path the client polls. */
const ROUTE = '/dsh-sidebar-balance/moonshot.json';
/** Credential refs tried in order when the Config names none. */
const DEFAULT_KEY_REFS = ['MOONSHOTAI_CN_API_KEY', 'MOONSHOT_API_KEY'];
/** Moonshot open-platform API root (the `moonshotai-cn` provider's host). */
const DEFAULT_BASE_URL = 'https://api.moonshot.cn/v1';
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
/**
 * A failed read is cached only this long. Holding a transient network blip for
 * the full `cacheTtlMs` would keep showing an outage for the rest of the minute
 * after connectivity is already back, which is exactly when someone is looking
 * at the panel wondering why it is still broken.
 */
const FAILURE_CACHE_TTL_MS = 5_000;
/** Wait before the single retry; a warm resolver answers immediately. */
const RETRY_DELAY_MS = 500;
/**
 * Transport failures that a second attempt can plausibly fix. A cold DNS lookup
 * and a dropped or timed-out connect usually succeed immediately afterwards;
 * `ENOTFOUND` (no such host) and `ECONNREFUSED` are deterministic, so retrying
 * those would only delay the report.
 */
const RETRIABLE_TRANSPORT_CODES = new Set([
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
  'ETIMEDOUT',
  'ECONNRESET',
  'EAI_AGAIN',
]);

export const Config = Schema.object({
  /** Credential references tried in order; the first configured one wins. */
  keyRefs: Schema.array(Schema.string()).default(DEFAULT_KEY_REFS),
  /** API root; the wallet endpoint is `${baseUrl}/users/me/balance`. */
  baseUrl: Schema.string().default(DEFAULT_BASE_URL),
  /** Serve a cached read this long; the page only polls once a minute. */
  cacheTtlMs: Schema.natural().min(0).max(600_000).default(55_000),
  /** One upstream read never hangs the route longer than this. */
  fetchTimeoutMs: Schema.natural().min(1_000).max(120_000).default(20_000),
  /** Cadence the page polls both providers at. */
  pollIntervalMs: Schema.natural().min(10_000).max(3_600_000).default(60_000),
  /** Off hides the Moonshot section and stops the route touching the network. */
  showMoonshot: Schema.boolean().default(true),
});

/** A non-empty string array, or the fallback when the Config supplies none. */
function refsOf(value) {
  if (!Array.isArray(value)) return DEFAULT_KEY_REFS;
  const refs = value.filter((ref) => typeof ref === 'string' && ref !== '');
  return refs.length > 0 ? refs : DEFAULT_KEY_REFS;
}

/**
 * The syscall-level code behind a failed fetch (`ENOTFOUND`, `ECONNRESET`,
 * `UND_ERR_CONNECT_TIMEOUT`, …), or null when there is none to read.
 */
function transportCodeOf(cause) {
  if (cause === null || typeof cause !== 'object') return null;
  const inner = cause.cause;
  if (inner !== null && typeof inner === 'object' && typeof inner.code === 'string') return inner.code;
  return typeof cause.code === 'string' ? cause.code : null;
}

/**
 * The reason a fetch threw, with the underlying cause named. `fetch` reports
 * every transport failure as the bare string "fetch failed" and hides the real
 * one (`ENOTFOUND`, `ECONNRESET`, `UND_ERR_CONNECT_TIMEOUT`, a TLS error) in
 * `cause.cause`; without it an outage is indistinguishable from a bad address.
 */
function describeFetchError(cause) {
  if (cause === null || typeof cause !== 'object') return String(cause);
  const parts = [];
  if (typeof cause.message === 'string' && cause.message !== '') parts.push(cause.message);
  const inner = cause.cause;
  if (inner !== null && typeof inner === 'object') {
    if (typeof inner.code === 'string' && inner.code !== '') parts.push(inner.code);
    else if (typeof inner.message === 'string' && inner.message !== '') parts.push(inner.message);
  }
  return parts.length > 0 ? parts.join(' / ') : String(cause);
}

export function apply(ctx, config = {}) {
  const keyRefs = refsOf(config.keyRefs);
  const baseUrl = typeof config.baseUrl === 'string' && config.baseUrl !== ''
    ? config.baseUrl.replace(/\/+$/, '')
    : DEFAULT_BASE_URL;
  const balanceUrl = `${baseUrl}/users/me/balance`;
  const cacheTtlMs = Number.isFinite(config.cacheTtlMs) ? config.cacheTtlMs : 55_000;
  const fetchTimeoutMs = Number.isFinite(config.fetchTimeoutMs) ? config.fetchTimeoutMs : 20_000;
  const showMoonshot = config.showMoonshot !== false;
  const pollIntervalMs = Number.isFinite(config.pollIntervalMs) ? config.pollIntervalMs : 60_000;
  /** Knobs the client adopts from every answer (it cannot read this Config). */
  const settings = { pollIntervalMs, showMoonshot };

  ctx.inject(['webServer', 'credentials', 'connection'], (scoped) => {
    let cache = null;
    let inFlight = null;

    /** The first configured key among `keyRefs`, or null while none is set. */
    async function resolveKey() {
      for (const ref of keyRefs) {
        let cred = null;
        try {
          cred = await scoped.credentials.resolve(ref);
        } catch (_cause) {
          cred = null;
        }
        if (cred && typeof cred.value === 'string' && cred.value !== '') return cred.value;
      }
      return null;
    }

    /**
     * One upstream attempt, plus whether a retry could plausibly fix it.
     * Measured on this class of machine: a cold `dns.lookup` can take 7+ seconds
     * and blow undici's 10s connect timeout, after which the very next attempt
     * hits a warm cache and succeeds. Deterministic outcomes — a refusal, an
     * HTTP error, or our own abort because the upstream is genuinely slow — are
     * not worth a second round trip.
     */
    async function attemptBalance() {
      const key = await resolveKey();
      if (key === null) return { payload: { ok: true, status: 'no-credential', settings } };
      const controller = new AbortController();
      const timer = setTimeout(() => { controller.abort(); }, fetchTimeoutMs);
      try {
        const response = await fetch(balanceUrl, {
          headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
          signal: controller.signal,
        });
        const text = await response.text();
        let json = null;
        try { json = JSON.parse(text); } catch (_cause) { json = null; }
        if (!response.ok) {
          const message = json && json.error && typeof json.error.message === 'string'
            ? json.error.message
            : `HTTP ${response.status}`;
          return { payload: { ok: true, status: 'failed', code: 'http', error: message.slice(0, 200), settings } };
        }
        const data = json && typeof json === 'object' ? json.data : null;
        if (data === null || typeof data !== 'object'
          || typeof data.available_balance !== 'number' || !Number.isFinite(data.available_balance)) {
          return { payload: { ok: true, status: 'failed', code: 'payload', error: 'unexpected balance payload', settings } };
        }
        return {
          payload: {
            ok: true,
            status: 'ready',
            currency: 'CNY',
            available: data.available_balance,
            cash: typeof data.cash_balance === 'number' && Number.isFinite(data.cash_balance) ? data.cash_balance : null,
            voucher: typeof data.voucher_balance === 'number' && Number.isFinite(data.voucher_balance) ? data.voucher_balance : null,
            settings,
          },
        };
      } catch (cause) {
        // `code` is what the page localizes; `error` keeps the provider's own
        // words — plus the underlying transport cause — for the tooltip, so a
        // report stays diagnosable.
        const aborted = cause !== null && typeof cause === 'object' && cause.name === 'AbortError';
        const transport = transportCodeOf(cause);
        return {
          payload: {
            ok: true,
            status: 'failed',
            code: aborted ? 'timeout' : 'network',
            error: (aborted ? 'request timed out' : describeFetchError(cause)).slice(0, 200),
            settings,
          },
          retriable: !aborted && RETRIABLE_TRANSPORT_CODES.has(transport),
        };
      } finally {
        clearTimeout(timer);
      }
    }

    /** One upstream wallet read, retrying a warm-up-shaped transport failure once. */
    async function readBalance() {
      const first = await attemptBalance();
      if (first.retriable !== true) return first.payload;
      await new Promise((resolve) => { setTimeout(resolve, RETRY_DELAY_MS); });
      const second = await attemptBalance();
      return second.payload;
    }

    /**
     * Cached shared read: concurrent polls join one flight. Successes ride the
     * configured TTL; failures expire almost immediately so a blip cannot be
     * replayed to the page for the rest of the interval.
     */
    function balancePayload(refresh) {
      if (!refresh && cache !== null && Date.now() - cache.at < cache.ttlMs) {
        return Promise.resolve(cache.payload);
      }
      if (inFlight !== null) return inFlight;
      inFlight = readBalance().then((payload) => {
        const failed = payload !== null && typeof payload === 'object' && payload.status === 'failed';
        cache = { at: Date.now(), payload, ttlMs: failed ? Math.min(FAILURE_CACHE_TTL_MS, cacheTtlMs) : cacheTtlMs };
        inFlight = null;
        return payload;
      }, (cause) => {
        inFlight = null;
        throw cause;
      });
      return inFlight;
    }

    function send(res, body) {
      res.writeHead(200, JSON_HEADERS);
      res.end(JSON.stringify(body));
    }

    scoped.effect(() => scoped.webServer.register({
      kind: 'exact',
      path: ROUTE,
      handler: async (req, res) => {
        // Browser-session trust fence, same as every other local JSON route:
        // only a request Connection would admit reaches the balance read.
        let code;
        try {
          code = scoped.connection.requestRejection(req);
        } catch (_cause) {
          code = 403;
        }
        if (code) {
          res.statusCode = code;
          res.end();
          return;
        }
        // The client still polls while the section is off: that answer is how
        // it learns the setting, and it must cost no credential or network work.
        if (!showMoonshot) {
          send(res, { ok: true, status: 'disabled', settings });
          return;
        }
        let refresh = false;
        try {
          refresh = new URL(req.url || '/', 'http://localhost').searchParams.get('refresh') === '1';
        } catch (_cause) { /* a malformed query keeps the default read */ }
        try {
          send(res, await balancePayload(refresh));
        } catch (cause) {
          send(res, {
            ok: false,
            status: 'failed',
            code: 'unknown',
            error: String((cause && cause.message) || cause).slice(0, 200),
            settings,
          });
        }
      },
    }));
  });
}
