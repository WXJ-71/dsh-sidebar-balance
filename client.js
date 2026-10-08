window.__ModuleLoader__.load({
  id: '@local/dsh-sidebar-balance',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'sidebar.balance';
    /** Fallback cadence; the Host Config's `pollIntervalMs` takes over once it answers. */
    const POLL_MS = 60_000;
    /** Faster cadence while a browser sign-in attempt is in flight. */
    const SIGN_IN_POLL_MS = 2_000;
    /** Platform amounts are unsigned decimal strings; anything else is not displayable. */
    const AMOUNT = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/;
    /** Same-origin route the Host half answers with the Moonshot wallet read. */
    const MOONSHOT_URL = '/dsh-sidebar-balance/moonshot.json';
    /** Stable id linking the chip's aria-controls to the panel it opens. */
    const PANEL_ID = 'dsh-sidebar-balance-panel';
    /**
     * The host's own focusable selector, copied so Tab ownership matches the
     * modal layer rather than inventing a second definition of "focusable".
     */
    const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]';
    /** The client version this bundle was authored against, sent as `x-client-version`. */
    const CLIENT_VERSION = '0.2.0-rc.2';
    /**
     * DeepSeek bills the standard rate in two UTC windows on weekdays, and the
     * discount rate in every other hour — weekends and Chinese public holidays in
     * full. `[from, to)` in minutes since UTC midnight. Off-peak rates are half
     * the peak rates; see https://api-docs.deepseek.com/quick_start/pricing.
     */
    const PEAK_WINDOWS = [[1 * 60, 4 * 60], [6 * 60, 10 * 60]];
    /**
     * UTC minutes at which the billed window can change: midnight (the weekday and
     * the date roll over) plus both edges of both peak windows. Sorted.
     */
    const BILLING_EDGES = [0, 60, 240, 360, 600];
    /**
     * Chinese public holidays, billed at the discount rate all day. Keyed by year,
     * as `MM-DD`. The State Council publishes each year's arrangement the November
     * before, so a year missing here falls back to the weekday rule — the dot then
     * claims peak on a holiday, never a discount that is not there. 2026 is
     * 国办发明电〔2025〕7号, https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm.
     */
    const CN_HOLIDAYS = {
      2026: [
        '01-01', '01-02', '01-03',
        '02-15', '02-16', '02-17', '02-18', '02-19', '02-20', '02-21', '02-22', '02-23',
        '04-04', '04-05', '04-06',
        '05-01', '05-02', '05-03', '05-04', '05-05',
        '06-19', '06-20', '06-21',
        '09-25', '09-26', '09-27',
        '10-01', '10-02', '10-03', '10-04', '10-05', '10-06', '10-07',
      ],
    };

    const en = {
      label: 'Balance',
      loading: 'Reading…',
      failed: 'Unavailable',
      signedOut: 'Not signed in',
      signedOutHint: 'Sign in with your DeepSeek account to show the balance here.',
      unavailableHint: 'This build exposes no DeepSeek account service.',
      signIn: 'Sign in',
      signInHint: 'A new tab opens on the DeepSeek Platform. After you approve, the balance appears here.',
      waiting: 'Waiting for sign-in…',
      waitingHint: 'Finish signing in the opened tab. This page updates by itself.',
      open: 'Open sign-in page',
      popupBlocked: 'The tab did not open. Use the button below.',
      cancel: 'Cancel',
      refresh: 'Refresh',
      updated: 'Updated',
      toppedUp: 'Topped-up balance',
      bonus: 'Granted balance',
      usage: 'Usage',
      topUp: 'Top up',
      empty: 'No wallet returned',
      peak: 'peak billing hours',
      offPeak: 'off-peak discount hours',
      deepseek: 'DeepSeek',
      moonshot: 'Moonshot AI CN',
      moonshotCash: 'Cash balance',
      moonshotVoucher: 'Voucher balance',
      moonshotNoKey: 'No Moonshot credential (MOONSHOTAI_CN_API_KEY) is configured.',
      errorUnknown: 'Unknown error',
      errorTimeout: 'The Moonshot read timed out',
      errorPayload: 'Moonshot returned an unexpected payload',
      errorHttp: 'Moonshot refused the read',
      errorNetwork: 'Could not reach the provider',
      errorHostRoute: 'Host route missing — restart the Harness to finish updating this plugin',
      errorWallet: 'The Platform wallet read failed',
      errorExpired: 'The sign-in attempt expired',
      errorStorage: 'The stored grant could not be read',
      errorProtocol: 'The sign-in callback origin was rejected',
    };

    const zh = {
      label: '余额',
      loading: '读取中…',
      failed: '暂不可用',
      signedOut: '未登录',
      signedOutHint: '登录 DeepSeek 账号后，这里会显示余额。',
      unavailableHint: '当前构建没有可用的 DeepSeek 账户服务。',
      signIn: '登录',
      signInHint: '会在新标签页打开 DeepSeek 开放平台，确认授权后余额自动显示在这里。',
      waiting: '等待登录完成…',
      waitingHint: '请在弹出的标签页里完成登录，本页面会自动更新。',
      open: '打开授权页',
      popupBlocked: '标签页没有自动打开，请点下面的按钮。',
      cancel: '取消',
      refresh: '刷新',
      updated: '更新于',
      toppedUp: '充值余额',
      bonus: '赠金余额',
      usage: '用量',
      topUp: '去充值',
      empty: '没有返回钱包',
      peak: '计费高峰时段',
      offPeak: '空闲优惠时段',
      deepseek: 'DeepSeek',
      moonshot: 'Moonshot AI CN',
      moonshotCash: '现金余额',
      moonshotVoucher: '赠金余额',
      moonshotNoKey: '未配置 Moonshot 凭据（MOONSHOTAI_CN_API_KEY）。',
      errorUnknown: '未知错误',
      errorTimeout: 'Moonshot 读取超时',
      errorPayload: 'Moonshot 返回了无法识别的数据',
      errorHttp: 'Moonshot 拒绝了这次读取',
      errorNetwork: '无法连接到服务方',
      errorHostRoute: 'Host 路由缺失——重启 Harness 以完成插件更新',
      errorWallet: '平台钱包读取失败',
      errorExpired: '登录尝试已超时',
      errorStorage: '已保存的授权无法解析',
      errorProtocol: '登录回调地址被拒绝',
    };

    const CSS = [
      '.dsh-sidebar-balance_chip{box-sizing:border-box;width:calc(100% + 4px);height:42px;display:inline-flex;align-items:center;gap:8px;margin:0 -2px;padding:0 10px 0 8px;border:none;border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:14px;line-height:20px;cursor:pointer;overflow:hidden}',
      '.dsh-sidebar-balance_chip:hover,.dsh-sidebar-balance_chip[data-open]{background:var(--dsw-specific-sidebar-fill)}',
      '.dsh-sidebar-balance_chip:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
      '.dsh-sidebar-balance_icon{flex:none;display:inline-flex;color:var(--dsw-alias-label-primary)}',
      '.dsh-sidebar-balance_iconIdle{color:var(--dsw-alias-state-success-primary)}',
      '.dsh-sidebar-balance_iconPeak{color:var(--dsw-alias-state-error-primary)}',
      '.dsh-sidebar-balance_label{flex:none;color:var(--dsw-alias-label-primary)}',
      '.dsh-sidebar-balance_amount{margin-left:auto;flex:none;font-size:13px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}',
      '.dsh-sidebar-balance_state{margin-left:auto;flex:none;font-size:12px;color:var(--dsw-alias-label-primary)}',
      '.dsh-sidebar-balance_chip[data-state=failed] .dsh-sidebar-balance_state{color:var(--dsw-alias-state-error-primary)}',
      '.dsh-sidebar-balance_chip[data-state=pending] .dsh-sidebar-balance_state{color:var(--dsw-alias-brand-primary)}',
      '.dsh-sidebar-balance_chip[data-rail]{width:36px;height:36px;margin:0;padding:0;border-radius:50%;justify-content:center}',
      '.dsh-sidebar-balance_chip[data-rail] .dsh-sidebar-balance_label,.dsh-sidebar-balance_chip[data-rail] .dsh-sidebar-balance_amount,.dsh-sidebar-balance_chip[data-rail] .dsh-sidebar-balance_state{display:none}',
      '.dsh-sidebar-balance_panel{position:fixed;z-index:40;box-sizing:border-box;width:264px;padding:10px 12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-overlay);box-shadow:var(--dsw-elevation-prominent,0 8px 24px rgba(0,0,0,.16));color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;line-height:20px}',
      '.dsh-sidebar-balance_panel:focus{outline:none}',
      '.dsh-sidebar-balance_row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;min-height:24px}',
      '.dsh-sidebar-balance_row+.dsh-sidebar-balance_row{margin-top:2px}',
      '.dsh-sidebar-balance_rowLabel{min-width:0;color:var(--dsw-alias-label-secondary)}',
      '.dsh-sidebar-balance_rowValue{flex:none;font-variant-numeric:tabular-nums}',
      '.dsh-sidebar-balance_divider{height:1px;margin:8px 0;background:var(--dsw-alias-border-l1)}',
      '.dsh-sidebar-balance_note{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;overflow-wrap:anywhere}',
      '.dsh-sidebar-balance_error{margin-top:6px;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;overflow-wrap:anywhere}',
      '.dsh-sidebar-balance_actions{display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:8px;margin-top:8px}',
      '.dsh-sidebar-balance_stamp{margin-right:auto;color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}',
      '.dsh-sidebar-balance_action{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:52px;height:28px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;line-height:18px;text-decoration:none;cursor:pointer;white-space:nowrap}',
      '.dsh-sidebar-balance_action:hover{background:var(--dsw-specific-sidebar-fill)}',
      '.dsh-sidebar-balance_action:disabled{color:var(--dsw-alias-label-secondary);cursor:default}',
      '.dsh-sidebar-balance_action:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
      '.dsh-sidebar-balance_action[data-variant=primary]{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary)}',
      '@keyframes dsh-sidebar-balance_spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}',
      '.dsh-sidebar-balance_spin{animation:dsh-sidebar-balance_spin .9s linear infinite}',
      '@media (prefers-reduced-motion: reduce){.dsh-sidebar-balance_spin{animation:none}}',
    ].join('');

    /**
     * Wallet glyph, drawn inline so the plugin imports no Harness Client package.
     * Modelled on the two reference icons the plugin owner supplied: a landscape
     * billfold with a snap clasp. The body is 11.25 x 9 (1.25:1, the ratio of
     * both references and of a folded wallet), and the clasp is the two parallel
     * lines that run into the right edge joined by a semicircular end whose
     * centre carries the snap dot — the earlier 50.6%-across cap, so the clasp
     * reads at the 16 px the chip renders it.
     *
     * Drawn heavier than the references (1.2 of 16, not 5% of the width) because
     * the chip is 16 px, not a 36 px app tile. Their other two details are
     * deliberately absent: the top flap seam of the second reference needs a
     * clear band above the clasp that 16 px does not have, and its `$` coin
     * overlaps the body at a size where the glyph would be illegible.
     *
     * The blank left panel stays blank: the two billing dots it used to hold are
     * gone. The billing period rides on the whole glyph instead — every stroke
     * is `currentColor`, so the caller's icon tone paints it green during
     * off-peak discount hours and red during peak hours, in both themes.
     */
    function WalletIcon({ size }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
        'aria-hidden': 'true', focusable: 'false', style: { display: 'block' },
      }, [
        h('path', {
          key: 'body',
          d: 'M3.85 3.5h8.25a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H3.85a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5Z',
          stroke: 'currentColor', strokeWidth: '1.2', strokeLinejoin: 'round',
        }),
        h('path', {
          key: 'clasp',
          d: 'M13.6 5.9H10.14A2.1 2.1 0 0 0 10.14 10.1H13.6',
          stroke: 'currentColor', strokeWidth: '1.2',
        }),
        h('circle', { key: 'snap', cx: '10.14', cy: '8', r: '0.75', fill: 'currentColor' }),
      ]);
    }

    /** Refresh glyph, spinning while a read is in flight. */
    function RefreshIcon({ size, spinning }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 16 16', fill: 'none',
        'aria-hidden': 'true', focusable: 'false',
        className: spinning ? 'dsh-sidebar-balance_spin' : undefined,
        style: { display: 'block' },
      }, h('path', {
        d: 'M13 8a5 5 0 1 1-1.6-3.67M13 2.5V5.5H10',
        stroke: 'currentColor', strokeWidth: '1.3', strokeLinecap: 'round', strokeLinejoin: 'round',
      }));
    }

    /** Whether a Platform amount is a displayable unsigned decimal string. */
    function usable(amount) {
      return typeof amount === 'string' && AMOUNT.test(amount.trim());
    }

    /** Format one wallet amount, keeping sub-cent balances visible. */
    function formatAmount(amount) {
      const text = String(amount).trim();
      const value = Number(text);
      if (!Number.isFinite(value)) return text;
      if (value > 0 && value < 0.01) return '<0.01';
      return value.toFixed(2);
    }

    /** Signed symbol for one wallet currency. */
    function symbolOf(currency) {
      return currency === 'CNY' ? '¥' : '$';
    }

    /** Full display text of one wallet amount. */
    function displayAmount(wallet) {
      return `${symbolOf(wallet.currency)}${formatAmount(wallet.amount)}`;
    }

    /** The account client identity every account Remote call carries. */
    function clientMetadata(locale) {
      return {
        version: CLIENT_VERSION,
        locale,
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      };
    }

    /** Wallet rows of a balance result; granted credit shows only when positive. */
    function walletsOf(balance) {
      if (balance === null || typeof balance !== 'object' || balance.status !== 'ready') return [];
      const rows = [];
      for (const wallet of balance.value ?? []) {
        if (wallet !== null && typeof wallet === 'object' && usable(wallet.balance)) {
          rows.push({ kind: 'toppedUp', currency: wallet.currency, amount: wallet.balance });
        }
      }
      for (const wallet of balance.bonusWallets ?? []) {
        if (wallet !== null && typeof wallet === 'object' && usable(wallet.balance) && Number(wallet.balance) > 0) {
          rows.push({ kind: 'bonus', currency: wallet.currency, amount: wallet.balance });
        }
      }
      return rows;
    }

    /** The row the chip shows: a topped-up wallet wins over granted credit. */
    function headline(rows) {
      return rows.find((row) => row.kind === 'toppedUp') ?? rows[0];
    }

    /** An in-flight sign-in attempt exposed by the account view. */
    function attemptOf(view) {
      const attempt = view === null || typeof view !== 'object' ? null : view.attempt;
      return attempt === null || typeof attempt !== 'object' ? null : attempt;
    }

    /** Phases that mean "the browser is still working on it". */
    function pendingPhase(phase) {
      return phase === 'initializing' || phase === 'waiting-browser' || phase === 'exchanging' || phase === 'committing';
    }

    /** Whether a Remote value is one of the generated `{ ok, ... }` outcomes. */
    function outcomeOf(value) {
      return value !== null && typeof value === 'object' && typeof value.ok === 'boolean' ? value : null;
    }

    /** Human-readable text for a thrown value or a failed Remote outcome. */
    function messageOf(cause) {
      if (cause === null || cause === undefined) return 'unknown error';
      if (typeof cause === 'string') return cause;
      if (typeof cause === 'object') {
        const error = cause.error;
        if (error !== null && typeof error === 'object' && typeof error.code === 'string') {
          return `${error.code}: ${String(error.message ?? '')}`;
        }
        if (typeof cause.message === 'string') return cause.message;
      }
      return String(cause);
    }

    /**
     * Display key for every failure this plugin can show. The Host route codes
     * (`timeout`, `payload`, `http`, `network`, `unknown`) and this half's own
     * codes (`host-route`, `wallet`) are ours; `expired`, `storage`, and
     * `protocol` are the account Remote's documented codes. Anything else is
     * provider text and is printed as it arrives — an unmapped message is worth
     * more to a reader than a generic replacement.
     */
    const FAILURE_KEYS = {
      timeout: 'errorTimeout',
      payload: 'errorPayload',
      http: 'errorHttp',
      network: 'errorNetwork',
      unknown: 'errorUnknown',
      'host-route': 'errorHostRoute',
      wallet: 'errorWallet',
      expired: 'errorExpired',
      storage: 'errorStorage',
      protocol: 'errorProtocol',
    };

    /** One failure as `{ code?, error? }`, keeping the code a Remote outcome carries. */
    function remoteFailure(cause) {
      if (cause !== null && typeof cause === 'object' && typeof cause !== 'string') {
        const error = cause.error;
        if (error !== null && typeof error === 'object' && typeof error.code === 'string') {
          return { code: error.code, error: typeof error.message === 'string' ? error.message : undefined };
        }
      }
      return { error: messageOf(cause) };
    }

    /**
     * Localized text for a failure, with the provider's own words kept after a
     * separator so the message stays diagnosable without being unreadable.
     */
    function failureText(t, failure) {
      if (failure === null || failure === undefined) return t('errorUnknown');
      if (typeof failure === 'string') return failure;
      const code = typeof failure.code === 'string' ? failure.code : null;
      const detail = typeof failure.error === 'string' && failure.error !== '' ? failure.error : null;
      const key = code === null ? undefined : FAILURE_KEYS[code];
      if (key === undefined) return detail ?? t('errorUnknown');
      return detail === null || detail === t(key) ? t(key) : `${t(key)} · ${detail}`;
    }

    /** One wallet line inside the panel. */
    function WalletRow({ row, t }) {
      return h('div', { className: 'dsh-sidebar-balance_row' }, [
        h('span', { key: 'label', className: 'dsh-sidebar-balance_rowLabel' }, t(row.kind)),
        h('span', { key: 'value', className: 'dsh-sidebar-balance_rowValue' }, displayAmount(row)),
      ]);
    }

    /** Minutes since UTC midnight; both peak windows and their edges are UTC. */
    function utcMinutes(date) {
      return date.getUTCHours() * 60 + date.getUTCMinutes();
    }

    /**
     * Whether DeepSeek bills the standard rate right now: a weekday, inside one of
     * the two UTC windows, and not a Chinese public holiday. Inside those windows
     * the UTC and Beijing calendar days agree, so the UTC date is also the right
     * key for the holiday table; outside them the answer is off-peak either way,
     * so the two calendars never need reconciling.
     */
    function peakAt(date) {
      const weekday = date.getUTCDay();
      if (weekday === 0 || weekday === 6) return false;
      const minutes = utcMinutes(date);
      if (!PEAK_WINDOWS.some(([from, to]) => minutes >= from && minutes < to)) return false;
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const holidays = CN_HOLIDAYS[date.getUTCFullYear()];
      return holidays === undefined || !holidays.includes(`${month}-${day}`);
    }

    /** Milliseconds until the billed window can next change, floored so a rounding edge cannot spin. */
    function msUntilBillingEdge(date) {
      const minutes = utcMinutes(date);
      const edge = BILLING_EDGES.find((value) => value > minutes);
      const target = edge === undefined ? 1440 : edge;
      return Math.max(1000, (target - minutes) * 60_000 - date.getSeconds() * 1000 - date.getMilliseconds() + 500);
    }

    /**
     * Track the billing window. One timer re-arms for the next edge, and a
     * suspended tab — phones freeze timers — re-reads the clock on return.
     */
    function useOffPeak() {
      const [offPeak, setOffPeak] = React.useState(() => !peakAt(new Date()));
      React.useEffect(() => {
        let timer = null;
        const arm = () => {
          const now = new Date();
          setOffPeak(!peakAt(now));
          timer = setTimeout(arm, msUntilBillingEdge(now));
        };
        arm();
        const onVisible = () => {
          if (document.visibilityState !== 'visible') return;
          clearTimeout(timer);
          arm();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
          clearTimeout(timer);
          document.removeEventListener('visibilitychange', onVisible);
        };
      }, []);
      return offPeak;
    }

    /** Balance chip at the sidebar foot plus its account panel. */
    function SidebarBalance(props) {
      const { wide, t, account, readLocale } = props;
      const [phase, setPhase] = React.useState('loading');
      const [state, setState] = React.useState(null);
      const [balance, setBalance] = React.useState(null);
      const [error, setError] = React.useState(null);
      const [at, setAt] = React.useState(null);
      const [signIn, setSignIn] = React.useState({
        id: null, phase: null, url: null, error: null, opening: false, popupBlocked: false,
      });
      const [open, setOpen] = React.useState(false);
      const [origin, setOrigin] = React.useState(null);
      const hostRef = React.useRef(null);
      const panelRef = React.useRef(null);
      const refreshRef = React.useRef(() => {});
      const moonshotRefreshRef = React.useRef(() => {});
      const openUrlRef = React.useRef(() => false);
      const active = React.useRef(true);
      const offPeak = useOffPeak();
      /** Moonshot (moonshotai-cn) wallet payload from the Host route, or null until the first answer. */
      const [moonshot, setMoonshot] = React.useState(null);
      const [moonshotBusy, setMoonshotBusy] = React.useState(false);
      /** When the last successful Moonshot read landed, so the two sources never share one stamp. */
      const [moonshotAt, setMoonshotAt] = React.useState(null);
      /** In-flight feedback for the DeepSeek read; unlike `phase` it moves on every poll. */
      const [deepseekBusy, setDeepseekBusy] = React.useState(false);
      /** Both knobs arrive from the Host Config on every answer. */
      const [pollMs, setPollMs] = React.useState(POLL_MS);
      const [showMoonshot, setShowMoonshot] = React.useState(true);
      /** At most one DeepSeek read at a time; a poll and a click must never stack. */
      const deepseekInFlight = React.useRef(false);
      /** Overlapping Moonshot reads are fine (the Host merges them), so count rather than drop. */
      const moonshotPending = React.useRef(0);
      /** What had focus when the panel opened, so closing can hand it back. */
      const restoreFocusRef = React.useRef(null);
      /** Set when a click outside closed the panel: that click owns focus now. */
      const clickClosedRef = React.useRef(false);

      React.useEffect(() => () => {
        active.current = false;
      }, []);

      /** One DeepSeek read. The caller owns the in-flight flag; this never guards itself. */
      const readDeepseek = React.useCallback(async () => {
        setPhase((current) => (current === 'ready' ? current : 'loading'));
        let view = null;
        try {
          const answered = await account.getState();
          if (!active.current) return;
          if (answered.ok) view = answered.value;
          else setError(remoteFailure(answered));
        } catch (cause) {
          if (!active.current) return;
          setError(remoteFailure(cause));
        }
        if (!active.current) return;
        if (view === null) {
          setPhase('failed');
          return;
        }
        setState(view);
        const attempt = attemptOf(view);
        if (attempt !== null && pendingPhase(attempt.phase)) {
          setSignIn((current) => ({
            ...current,
            id: current.id ?? attempt.id ?? null,
            phase: attempt.phase,
            url: typeof attempt.authorizeUrl === 'string' ? attempt.authorizeUrl : current.url,
            error: null,
          }));
        } else {
          setSignIn((current) => (pendingPhase(current.phase) || current.error !== null
            ? { ...current, phase: null, error: null }
            : current));
        }
        if (view.status !== 'credential-stored') {
          setPhase('signedOut');
          setBalance(null);
          setError(null);
          return;
        }
        try {
          const locale = typeof readLocale === 'function' ? readLocale() : 'en';
          const answered = await account.getBalance(clientMetadata(locale));
          if (!active.current) return;
          if (!answered.ok) {
            setError(remoteFailure(answered));
            setPhase('failed');
            return;
          }
          const value = answered.value;
          setBalance(value);
          setAt(Date.now());
          if (value !== null && typeof value === 'object' && value.status === 'ready') {
            setError(null);
            setPhase('ready');
          } else {
            setError({ code: 'wallet' });
            setPhase('failed');
          }
        } catch (cause) {
          if (!active.current) return;
          setError(remoteFailure(cause));
          setPhase('failed');
        }
      }, [account, readLocale]);

      /**
       * Refresh entry point: one read at a time, with in-flight feedback the
       * button can actually see. `readDeepseek` deliberately keeps a settled
       * `ready` phase so the chip never flickers — which is exactly why the
       * button cannot derive its own state from `phase`.
       */
      const refresh = React.useCallback(async () => {
        if (account === undefined || account === null) {
          setPhase('unavailable');
          return;
        }
        if (deepseekInFlight.current) return;
        deepseekInFlight.current = true;
        setDeepseekBusy(true);
        try {
          await readDeepseek();
        } finally {
          deepseekInFlight.current = false;
          if (active.current) setDeepseekBusy(false);
        }
      }, [account, readDeepseek]);

      refreshRef.current = refresh;

      /** Adopt the Host Config knobs every answer carries; the page cannot read the Config itself. */
      const applySettings = React.useCallback((payload) => {
        const settings = payload !== null && typeof payload === 'object' ? payload.settings : null;
        if (settings === null || typeof settings !== 'object') return;
        if (typeof settings.showMoonshot === 'boolean') setShowMoonshot(settings.showMoonshot);
        if (typeof settings.pollIntervalMs === 'number' && Number.isFinite(settings.pollIntervalMs)) {
          setPollMs(Math.min(3_600_000, Math.max(10_000, settings.pollIntervalMs)));
        }
      }, []);

      /**
       * Poll the Host's Moonshot route. `bypass` skips its short server-side
       * cache (the refresh button); the plain poll rides it. Overlapping reads
       * are allowed — the Host merges them — so the busy flag is counted, not
       * latched, and the button keeps its spinner until the last one lands.
       */
      const refreshMoonshot = React.useCallback(async (bypass) => {
        moonshotPending.current += 1;
        setMoonshotBusy(true);
        try {
          const response = await fetch(bypass === true ? `${MOONSHOT_URL}?refresh=1` : MOONSHOT_URL, { cache: 'no-store' });
          if (!active.current) return;
          const type = response.headers.get('content-type') ?? '';
          if (!response.ok || !type.includes('json')) {
            // The Host route answers JSON; anything else means the Host half
            // is older than this build (restart the Harness) and the SPA
            // fallback served the page instead.
            setMoonshot({ ok: false, status: 'failed', code: 'host-route' });
            return;
          }
          const payload = await response.json();
          if (!active.current) return;
          setMoonshot(payload);
          applySettings(payload);
          if (payload !== null && typeof payload === 'object' && payload.status === 'ready') {
            setMoonshotAt(Date.now());
          }
        } catch (cause) {
          if (!active.current) return;
          setMoonshot({ ok: false, status: 'failed', code: 'network', error: messageOf(cause) });
        } finally {
          moonshotPending.current -= 1;
          if (moonshotPending.current === 0 && active.current) setMoonshotBusy(false);
        }
      }, [applySettings]);

      moonshotRefreshRef.current = refreshMoonshot;

      /** One read of both sources on mount; the cadence below is a separate owner. */
      React.useEffect(() => {
        refreshRef.current();
        moonshotRefreshRef.current();
      }, []);

      /** Cadence follows the Host Config, so a patch change lands without a reload. */
      React.useEffect(() => {
        const timer = setInterval(() => {
          refreshRef.current();
          moonshotRefreshRef.current();
        }, pollMs);
        return () => { clearInterval(timer); };
      }, [pollMs]);

      /** Phones freeze timers while hidden, so a returning tab reads immediately. */
      React.useEffect(() => {
        const onVisible = () => {
          if (document.visibilityState === 'visible') {
            refreshRef.current();
            moonshotRefreshRef.current();
          }
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => { document.removeEventListener('visibilitychange', onVisible); };
      }, []);

      /** Poll faster while the Platform finishes a sign-in attempt. */
      React.useEffect(() => {
        if (signIn.phase === null) return undefined;
        const timer = setInterval(() => { refreshRef.current(); }, SIGN_IN_POLL_MS);
        return () => { clearInterval(timer); };
      }, [signIn.phase]);

      /** Open one authorize URL; stable, so both the flow and the button can call it. */
      const openUrl = React.useCallback((url) => {
        if (typeof url !== 'string' || !/^https?:/i.test(url)) return false;
        try {
          return window.open(url, '_blank', 'noopener,noreferrer') !== null;
        } catch (_cause) {
          return false;
        }
      }, []);

      openUrlRef.current = openUrl;

      const startSignIn = React.useCallback(async () => {
        if (account === undefined || account === null) return;
        setSignIn({
          id: null, phase: 'initializing', url: null, error: null, opening: true, popupBlocked: false,
        });
        const locale = typeof readLocale === 'function' ? readLocale() : 'en';
        try {
          const answered = await account.startSignIn(clientMetadata(locale), window.location.origin, 'web');
          if (!active.current) return;
          if (!answered.ok) {
            setSignIn({
              id: null, phase: null, url: null, error: remoteFailure(answered), opening: false, popupBlocked: false,
            });
            return;
          }
          const view = answered.value;
          setState(view);
          const attempt = attemptOf(view);
          const url = attempt !== null && typeof attempt.authorizeUrl === 'string' ? attempt.authorizeUrl : null;
          /**
           * The Host already runs the attempt, so the tab is a convenience:
           * a blocked popup is a hint for the panel, never a rollback.
           */
          const blocked = url !== null && !openUrlRef.current(url);
          setSignIn({
            id: attempt === null ? null : attempt.id ?? null,
            phase: attempt === null ? null : attempt.phase ?? null,
            url,
            error: null,
            opening: false,
            popupBlocked: blocked,
          });
        } catch (cause) {
          if (!active.current) return;
          setSignIn({
            id: null, phase: null, url: null, error: remoteFailure(cause), opening: false, popupBlocked: false,
          });
        }
      }, [account, readLocale]);

      const cancelSignIn = React.useCallback(async () => {
        const id = signIn.id;
        setSignIn({
          id: null, phase: null, url: null, error: null, opening: false, popupBlocked: false,
        });
        if (account === undefined || account === null || id === null) return;
        try {
          if (account.cancelSignIn !== undefined) {
            const outcome = outcomeOf(await account.cancelSignIn(id));
            if (outcome !== null && outcome.ok) setState(outcome.value);
          }
        } catch (_cause) {
          /* cancellation is best-effort; the next poll reconciles the view. */
        }
        refreshRef.current();
      }, [account, signIn.id]);

      React.useLayoutEffect(() => {
        if (!open) return undefined;
        const place = () => {
          const host = hostRef.current;
          const panel = panelRef.current;
          if (host === null || panel === null) return;
          const rect = host.getBoundingClientRect();
          const top = Math.max(8, rect.top - panel.offsetHeight - 8);
          const left = Math.max(8, Math.min(rect.left, window.innerWidth - panel.offsetWidth - 8));
          setOrigin({ top, left });
        };
        place();
        window.addEventListener('resize', place);
        return () => { window.removeEventListener('resize', place); };
      }, [open]);

      /**
       * Popover keyboard ownership, mirroring the host's modal layer: only the
       * layer that owns focus takes Escape, Tab wraps inside the panel instead
       * of walking the page behind it, and a pointer elsewhere dismisses.
       */
      React.useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
          const host = hostRef.current;
          const panel = panelRef.current;
          if (host !== null && host.contains(event.target)) return;
          if (panel !== null && panel.contains(event.target)) return;
          clickClosedRef.current = true;
          setOpen(false);
        };
        const onKeyDown = (event) => {
          const panel = panelRef.current;
          if (panel === null) return;
          const focused = document.activeElement;
          // A host modal opened on top moves focus into itself and keeps Escape.
          if (focused !== null && focused !== document.body && !panel.contains(focused)) return;
          if (event.key === 'Escape') {
            if (event.shiftKey) return;
            event.preventDefault();
            setOpen(false);
            return;
          }
          if (event.key !== 'Tab') return;
          const items = [...panel.querySelectorAll(FOCUSABLE)]
            .filter((item) => item.closest('[inert], [hidden]') === null);
          const first = items[0] ?? panel;
          const last = items[items.length - 1] ?? panel;
          const atEdge = event.shiftKey ? focused === first : focused === last;
          if (focused === panel || atEdge) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
          }
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true);
          document.removeEventListener('keydown', onKeyDown);
        };
      }, [open]);

      /**
       * Focus lifetime: remember what opened the panel, give it back when the
       * panel closes on its own terms, and stay out of the way when the user
       * closed it by clicking something else.
       */
      React.useLayoutEffect(() => {
        if (!open) return undefined;
        clickClosedRef.current = false;
        restoreFocusRef.current = document.activeElement;
        return () => {
          if (clickClosedRef.current) return;
          const target = restoreFocusRef.current;
          if (target !== null && typeof target.focus === 'function' && target.isConnected) target.focus();
        };
      }, [open]);

      /**
       * Take focus once the panel is placed. It renders hidden until `origin` is
       * measured, and a hidden element cannot take focus, so this waits for that
       * measurement instead of racing it.
       */
      React.useLayoutEffect(() => {
        if (!open || origin === null) return undefined;
        const panel = panelRef.current;
        if (panel === null || panel.contains(document.activeElement)) return undefined;
        panel.focus();
        return undefined;
      }, [open, origin]);

      const rows = walletsOf(balance);
      const top = headline(rows);
      /** Initial-load feedback only: a settled `ready` phase is preserved on purpose. */
      const loading = phase === 'loading';
      /** Any provider read in flight — what the refresh button reports. */
      const inFlight = deepseekBusy || moonshotBusy;
      const signingIn = pendingPhase(signIn.phase) || signIn.opening;
      const amountText = top === undefined ? null : displayAmount(top);
      const moonshotReady = showMoonshot && moonshot !== null && moonshot.status === 'ready';
      const moonshotNoKey = moonshot !== null && moonshot.status === 'no-credential';
      const moonshotFailed = showMoonshot && moonshot !== null && !moonshotReady && !moonshotNoKey && moonshotBusy !== true;
      const moonshotAmount = moonshotReady ? `¥${formatAmount(String(moonshot.available))}` : null;
      /** The chip prefers DeepSeek; with no DeepSeek wallet it falls back to Moonshot. */
      const chipAmount = amountText !== null ? amountText : moonshotAmount;
      /** True when the shown amount is Moonshot's, so DeepSeek billing must not colour it. */
      const moonshotOnly = amountText === null && moonshotAmount !== null;
      const chipState = signingIn ? 'pending' : phase;
      const stateText = signingIn ? t('waiting')
        : loading ? t('loading')
          : chipAmount !== null ? null
            : phase === 'signedOut' ? t('signedOut')
              : t('failed');
      /** Localized text for the DeepSeek-side failure, or null while there is none. */
      const errorText = error === null ? null : failureText(t, error);
      const hint = phase === 'signedOut' ? t('signedOutHint')
        : phase === 'unavailable' ? t('unavailableHint')
          : errorText ?? (loading ? t('loading') : t('empty'));
      const summary = amountText !== null
        ? `${t('label')} ${rows.map(displayAmount).join(' + ')}`
        : moonshotAmount !== null
          ? `${t('moonshot')} ${moonshotAmount}`
          : `${t('label')} · ${stateText ?? t('failed')}`;
      /**
       * The billing window is a DeepSeek fact. It rides the tooltip — and the
       * icon tint below — only while the chip speaks for DeepSeek; a
       * Moonshot-only chip stays neutral rather than claiming a window that is
       * not Moonshot's to have.
       */
      const described = moonshotOnly ? summary : `${summary} · ${t(offPeak ? 'offPeak' : 'peak')}`;

      const primary = signingIn
        ? h('button', {
          key: 'open',
          type: 'button',
          className: 'dsh-sidebar-balance_action',
          'data-variant': 'primary',
          disabled: signIn.url === null,
          onClick: () => {
            const opened = openUrlRef.current(signIn.url);
            setSignIn((current) => ({ ...current, popupBlocked: !opened }));
          },
        }, t('open'))
        : phase === 'signedOut'
          ? h('button', {
            key: 'signIn',
            type: 'button',
            className: 'dsh-sidebar-balance_action',
            'data-variant': 'primary',
            disabled: signIn.opening,
            onClick: () => { startSignIn(); },
          }, t('signIn'))
          : null;

      /**
       * The Moonshot section: present outside a sign-in wait, and only while
       * the Host Config has it on. It carries its own stamp because the two
       * providers refresh on independent reads.
       */
      const moonshotSection = signingIn || !showMoonshot ? null : h(React.Fragment, { key: 'moonshot' }, [
        h('div', { key: 'divider', className: 'dsh-sidebar-balance_divider' }),
        h('div', { key: 'title', className: 'dsh-sidebar-balance_row' }, [
          h('span', { key: 'label', className: 'dsh-sidebar-balance_rowLabel' }, t('moonshot')),
          h('span', { key: 'value', className: 'dsh-sidebar-balance_rowValue' },
            moonshotAmount !== null ? moonshotAmount
              : moonshot === null || moonshotBusy ? t('loading')
                : '—'),
        ]),
        moonshotReady && moonshot.cash !== null
          ? h(WalletRow, { key: 'cash', row: { kind: 'moonshotCash', currency: 'CNY', amount: String(moonshot.cash) }, t })
          : null,
        moonshotReady && moonshot.voucher !== null
          ? h(WalletRow, { key: 'voucher', row: { kind: 'moonshotVoucher', currency: 'CNY', amount: String(moonshot.voucher) }, t })
          : null,
        moonshotAt === null
          ? null
          : h('div', { key: 'stamp', className: 'dsh-sidebar-balance_note' },
            `${t('updated')} ${new Date(moonshotAt).toLocaleTimeString()}`),
        moonshotNoKey
          ? h('div', { key: 'noKey', className: 'dsh-sidebar-balance_note' }, t('moonshotNoKey'))
          : null,
        moonshotFailed
          ? h('div', {
            key: 'moonshotError',
            className: 'dsh-sidebar-balance_error',
            // Keep the provider's own words reachable without printing them over
            // the localized line.
            title: typeof moonshot.error === 'string' ? moonshot.error : undefined,
          }, failureText(t, moonshot))
          : null,
      ]);

      const panel = open ? h('div', {
        ref: panelRef,
        id: PANEL_ID,
        className: 'dsh-sidebar-balance_panel',
        role: 'dialog',
        // Matches the host's modal layer: it takes focus on open, wraps Tab, and
        // owns Escape. There is deliberately no scrim — this stays a popover that
        // a click anywhere else dismisses.
        'aria-modal': 'true',
        'aria-label': t('label'),
        tabIndex: -1,
        style: origin === null ? { visibility: 'hidden', bottom: 56, left: 8 } : { top: origin.top, left: origin.left },
      }, [
        signingIn
          ? h('div', { key: 'waiting' }, [
            h('div', { key: 'title', className: 'dsh-sidebar-balance_row' }, t('waiting')),
            h('div', { key: 'text', className: 'dsh-sidebar-balance_note' },
              signIn.popupBlocked === true ? t('popupBlocked') : t('waitingHint')),
          ])
          : rows.length > 0
            ? h(React.Fragment, { key: 'deepseek' }, [
              h('div', { key: 'title', className: 'dsh-sidebar-balance_note' }, t('deepseek')),
              h('div', { key: 'wallets' }, rows.map((row) => h(WalletRow, { key: `${row.kind}-${row.currency}`, row, t }))),
            ])
            : h('div', { key: 'hint', className: 'dsh-sidebar-balance_note' },
              phase === 'signedOut' ? t('signInHint') : hint),
        moonshotSection,
        errorText !== null && !inFlight && !signingIn && rows.length > 0
          ? h('div', {
            key: 'error',
            className: 'dsh-sidebar-balance_error',
            // The unlocalized Remote detail stays available on hover.
            title: typeof error?.error === 'string' ? error.error : undefined,
          }, errorText)
          : null,
        signIn.error !== null
          ? h('div', {
            key: 'signInError',
            className: 'dsh-sidebar-balance_error',
            title: typeof signIn.error?.error === 'string' ? signIn.error.error : undefined,
          }, failureText(t, signIn.error))
          : null,
        h('div', { key: 'divider', className: 'dsh-sidebar-balance_divider' }),
        h('div', { key: 'actions', className: 'dsh-sidebar-balance_actions' }, [
          h('span', { key: 'stamp', className: 'dsh-sidebar-balance_stamp' },
            at === null ? '' : `${t('updated')} ${new Date(at).toLocaleTimeString()}`),
          signingIn
            ? h('button', {
              key: 'cancel',
              type: 'button',
              className: 'dsh-sidebar-balance_action',
              onClick: () => { cancelSignIn(); },
            }, t('cancel'))
            : null,
          state !== null && typeof state.links?.usageUrl === 'string' && rows.length > 0
            ? h('a', {
              key: 'usage',
              className: 'dsh-sidebar-balance_action',
              href: state.links.usageUrl,
              target: '_blank',
              rel: 'noreferrer',
            }, t('usage'))
            : null,
          state !== null && typeof state.links?.topUpUrl === 'string'
            ? h('a', {
              key: 'topUp',
              className: 'dsh-sidebar-balance_action',
              href: state.links.topUpUrl,
              target: '_blank',
              rel: 'noreferrer',
            }, t('topUp'))
            : null,
          primary,
          h('button', {
            key: 'refresh',
            type: 'button',
            className: 'dsh-sidebar-balance_action',
            disabled: inFlight,
            title: t('refresh'),
            'aria-label': t('refresh'),
            onClick: () => {
              refreshRef.current();
              moonshotRefreshRef.current(true);
            },
          }, h(RefreshIcon, { size: 14, spinning: inFlight })),
        ]),
      ]) : null;

      return h(React.Fragment, null, [
        h('button', {
          key: 'chip',
          ref: hostRef,
          type: 'button',
          className: 'dsh-sidebar-balance_chip',
          'data-state': chipState,
          'data-rail': wide ? undefined : true,
          'data-open': open ? true : undefined,
          'aria-label': described,
          'aria-expanded': open,
          'aria-haspopup': 'dialog',
          'aria-controls': open ? PANEL_ID : undefined,
          title: described,
          onClick: () => { setOpen((value) => !value); },
        }, [
          h('span', {
            key: 'icon',
            // Neutral while the chip speaks for Moonshot: the red/green tint is
            // DeepSeek's billing window and would misattribute it.
            className: moonshotOnly
              ? 'dsh-sidebar-balance_icon'
              : `dsh-sidebar-balance_icon ${offPeak ? 'dsh-sidebar-balance_iconIdle' : 'dsh-sidebar-balance_iconPeak'}`,
          }, h(WalletIcon, { size: wide ? 16 : 18 })),
          wide ? h('span', { key: 'label', className: 'dsh-sidebar-balance_label' }, t('label')) : null,
          wide && chipAmount !== null ? h('span', { key: 'amount', className: 'dsh-sidebar-balance_amount' }, chipAmount) : null,
          wide && stateText !== null ? h('span', { key: 'state', className: 'dsh-sidebar-balance_state' }, stateText) : null,
        ]),
        panel,
      ]);
    }

    /** Inject styles once per document; the returned disposer removes them on unload. */
    function installStyles() {
      if (typeof document === 'undefined') return () => {};
      const id = '@local/dsh-sidebar-balance/SidebarBalance.module.css';
      const selector = `style[data-plugin-css=${JSON.stringify(id)}]`;
      if (document.querySelector(selector) !== null) return () => {};
      const tag = document.createElement('style');
      tag.dataset.plugin = '@local/dsh-sidebar-balance';
      tag.dataset.pluginCss = id;
      tag.textContent = CSS;
      document.head.appendChild(tag);
      return () => { tag.remove(); };
    }

    const inject = ['slots', 'locale', 'remote', 'remote.account'];

    function apply(ctx) {
      ctx.effect(() => installStyles(), 'sidebar balance: styles');
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'sidebar balance: dictionaries');
      const t = ctx.locale.bind(NS);
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'account-balance',
        order: 0,
        label: () => t('label'),
        locale: NS,
        inject: () => ({
          account: ctx.get('remote.account'),
          readLocale: () => ctx.locale.getSnapshot().active,
        }),
      }, SidebarBalance));
    }

    return { inject, apply };
  },
});
