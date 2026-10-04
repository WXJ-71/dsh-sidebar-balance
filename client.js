window.__ModuleLoader__.load({
  id: '@local/dsh-sidebar-balance',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Dictionary namespace owned by this plugin. */
    const NS = 'sidebar.balance';
    const POLL_MS = 60_000;
    /** Faster cadence while a browser sign-in attempt is in flight. */
    const SIGN_IN_POLL_MS = 2_000;
    /** Platform amounts are unsigned decimal strings; anything else is not displayable. */
    const AMOUNT = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/;
    /** Spend arithmetic runs in millionths of the wallet currency, so shares add up exactly. */
    const MICROS = 1_000_000;
    /**
     * Spend popups. One balance read's drop is drained over this many pieces, which
     * is the read interval divided by the popup cadence below (60s / 1.2s), so the
     * minute of spending just detected lasts about a minute of popups instead of
     * emptying in a burst and leaving the rest of the minute blank.
     */
    const SPEND_PIECES = 50;
    /**
     * One popup every 1-1.4s against a 1.6s life, so the next number is already up
     * before the previous fades — the column reads as one continuous stream rather
     * than separate blips, with one or two numbers in the air at a time.
     */
    const SPEND_GAP_MS = [1_000, 1_400];
    const SPEND_LIFE_MS = 1_600;
    /**
     * How far above the chip's centre a popup is anchored. Measured from the centre
     * rather than the top edge so the 36px rail chip, whose 18px glyph sits higher,
     * gets the same clearance as the 42px wide chip. The line box is 16px and starts
     * 6px into the rise, so this leaves the digits' ink about 7px above the wallet
     * glyph's top edge — half a line box — while staying clear of the button itself.
     */
    const SPEND_LIFT = 34;
    /** Shares below this wait in the queue instead of printing a row of zeros. */
    const SPEND_MIN_MICROS = 100;
    /** The client version this bundle was authored against, sent as `x-client-version`. */
    const CLIENT_VERSION = '0.1.7-rc.2';
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
    };

    const CSS = [
      '.dsh-sidebar-balance_chip{box-sizing:border-box;width:calc(100% + 4px);height:42px;display:inline-flex;align-items:center;gap:8px;margin:0 -2px;padding:0 10px 0 8px;border:none;border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:14px;line-height:20px;cursor:pointer;overflow:hidden}',
      '.dsh-sidebar-balance_chip:hover,.dsh-sidebar-balance_chip[data-open]{background:var(--dsw-specific-sidebar-fill)}',
      '.dsh-sidebar-balance_chip:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
      '.dsh-sidebar-balance_icon{flex:none;display:inline-flex;color:var(--dsw-alias-label-primary)}',
      '.dsh-sidebar-balance_label{flex:none;color:var(--dsw-alias-label-primary)}',
      '.dsh-sidebar-balance_amount{margin-left:auto;flex:none;font-size:13px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}',
      '.dsh-sidebar-balance_state{margin-left:auto;flex:none;font-size:12px;color:var(--dsw-alias-label-primary)}',
      '.dsh-sidebar-balance_chip[data-state=failed] .dsh-sidebar-balance_state{color:var(--dsw-alias-state-error-primary)}',
      '.dsh-sidebar-balance_chip[data-state=pending] .dsh-sidebar-balance_state{color:var(--dsw-alias-brand-primary)}',
      '.dsh-sidebar-balance_chip[data-rail]{width:36px;height:36px;margin:0;padding:0;border-radius:50%;justify-content:center}',
      '.dsh-sidebar-balance_chip[data-rail] .dsh-sidebar-balance_label,.dsh-sidebar-balance_chip[data-rail] .dsh-sidebar-balance_amount,.dsh-sidebar-balance_chip[data-rail] .dsh-sidebar-balance_state{display:none}',
      '.dsh-sidebar-balance_chip[data-rail] .dsh-sidebar-balance_icon{color:var(--dsw-alias-label-primary)}',
      '.dsh-sidebar-balance_panel{position:fixed;z-index:40;box-sizing:border-box;width:264px;padding:10px 12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-overlay);box-shadow:var(--dsw-elevation-prominent,0 8px 24px rgba(0,0,0,.16));color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;line-height:20px}',
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
      '.dsh-sidebar-balance_dotPeak{fill:var(--dsw-alias-state-error-primary);fill:color-mix(in srgb,var(--dsw-alias-state-error-primary) 80%,#000);--dsh-sidebar-balance_glow:var(--dsw-alias-state-error-primary)}',
      '.dsh-sidebar-balance_dotIdle{fill:var(--dsw-alias-state-success-primary);fill:color-mix(in srgb,var(--dsw-alias-state-success-primary) 80%,#000);--dsh-sidebar-balance_glow:var(--dsw-alias-state-success-primary)}',
      '.dsh-sidebar-balance_dotMuted{opacity:.55}',
      '@keyframes dsh-sidebar-balance_blink{0%,65%,100%{opacity:1}82%{opacity:.12}}',
      '.dsh-sidebar-balance_dotActive{animation:dsh-sidebar-balance_blink 1.4s ease-in-out infinite;filter:saturate(1.35) drop-shadow(0 0 1.1px var(--dsh-sidebar-balance_glow))}',
      '.dsh-sidebar-balance_pops{position:fixed;left:0;top:0;z-index:35;pointer-events:none}',
      '.dsh-sidebar-balance_pop{position:absolute;transform:translate(-50%,0);color:var(--dsw-alias-state-error-primary);color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 80%,#000);font-family:inherit;font-size:12px;font-weight:500;line-height:16px;font-variant-numeric:tabular-nums;white-space:nowrap;text-shadow:0 0 3px var(--dsw-specific-sidebar-fill);animation:dsh-sidebar-balance_float 1.6s ease-out forwards}',
      '@keyframes dsh-sidebar-balance_float{0%{opacity:0;transform:translate(-50%,6px)}15%{opacity:1}100%{opacity:0;transform:translate(-50%,-22px)}}',
      '@media (prefers-reduced-motion: reduce){.dsh-sidebar-balance_spin{animation:none}.dsh-sidebar-balance_dotActive{animation:none}.dsh-sidebar-balance_pop{animation:none}}',
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
     * `offPeak` fills the blank left panel with the billing indicator: a red dot
     * over a green one, centred in the band the clasp leaves free (x 2.95-7.44,
     * so 1.5 clear on both sides), the active one blinking and the other held
     * dim. `currentColor` keeps the outline on the theme's label tokens in light
     * and dark, while the dots keep the theme's error and success tokens.
     */
    function WalletIcon({ size, offPeak }) {
      const dot = (key, cx, cy, tone, active) => h('circle', {
        key,
        className: `dsh-sidebar-balance_dot${tone} dsh-sidebar-balance_dot${active ? 'Active' : 'Muted'}`,
        cx, cy, r: '0.75',
      });
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
        dot('peakDot', '5.2', '6.6', 'Peak', offPeak !== true),
        dot('idleDot', '5.2', '9.4', 'Idle', offPeak === true),
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

    /** Signed symbol for one Platform wallet currency. */
    function symbolOf(currency) {
      return currency === 'CNY' ? '¥' : '$';
    }

    /** One wallet amount as an integer of millionths, or null when it is unusable. */
    function micros(amount) {
      if (!usable(amount)) return null;
      const [whole, fraction = ''] = String(amount).trim().split('.');
      return Number(whole) * MICROS + Number(`${fraction}000000`.slice(0, 6));
    }

    /** Every wallet row added up, or null when a row is unusable or there are none. */
    function totalMicros(rows) {
      if (rows.length === 0) return null;
      let total = 0;
      for (const row of rows) {
        const value = micros(row.amount);
        if (value === null) return null;
        total += value;
      }
      return total;
    }

    /**
     * Spending text with as few decimals as the value needs, two at the least and
     * four at the most, so a sub-cent drop shows its own digits instead of the
     * chip's `<0.01` form without turning into a long tail. The queued shares stay
     * whole millionths; only this text rounds.
     */
    function formatSpend(value) {
      for (let digits = 2; digits < 4; digits += 1) {
        if (value % 10 ** (6 - digits) === 0) return (value / MICROS).toFixed(digits);
      }
      return (value / MICROS).toFixed(4);
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
      const openUrlRef = React.useRef(() => false);
      const active = React.useRef(true);
      const offPeak = useOffPeak();
      const [pops, setPops] = React.useState([]);
      const pendingRef = React.useRef(0);
      const shareRef = React.useRef(0);
      const spendTimerRef = React.useRef(null);
      const spendLifeRef = React.useRef([]);
      const totalRef = React.useRef(null);
      const currencyRef = React.useRef(null);
      const popSeqRef = React.useRef(0);

      React.useEffect(() => () => {
        active.current = false;
        if (spendTimerRef.current !== null) clearTimeout(spendTimerRef.current);
        for (const timer of spendLifeRef.current) clearTimeout(timer);
      }, []);

      const pumpRef = React.useRef(() => {});

      /** Arm the next popup; nothing is queued while the pending drop is too small to print. */
      const armSpend = React.useCallback(() => {
        if (spendTimerRef.current !== null || pendingRef.current < SPEND_MIN_MICROS) return;
        const [from, to] = SPEND_GAP_MS;
        spendTimerRef.current = setTimeout(() => {
          spendTimerRef.current = null;
          pumpRef.current();
        }, from + Math.random() * (to - from));
      }, []);

      /**
       * Queue one detected drop. The share is sized from the whole queue, so the
       * popups of a drop are spread over about `SPEND_PIECES` of them rather than
       * decaying geometrically, and every share is a whole millionth.
       */
      const queueSpend = React.useCallback((drop) => {
        pendingRef.current += drop;
        shareRef.current = Math.max(SPEND_MIN_MICROS, Math.ceil(pendingRef.current / SPEND_PIECES));
        armSpend();
      }, [armSpend]);

      /**
       * Float one share of the queued spending above the wallet, then re-arm while
       * any is left. Shares are whole millionths, so the popups of one detected
       * drop add up to exactly that drop.
       */
      pumpRef.current = () => {
        const pending = pendingRef.current;
        if (pending < SPEND_MIN_MICROS) return;
        const share = Math.min(pending, shareRef.current);
        pendingRef.current = pending - share;
        const rect = hostRef.current === null ? null : hostRef.current.getBoundingClientRect();
        if (rect !== null) {
          popSeqRef.current += 1;
          const id = popSeqRef.current;
          setPops((current) => [...current, {
            id,
            text: `-${symbolOf(currencyRef.current)}${formatSpend(share)}`,
            left: wide === true ? rect.left + 16 : rect.left + rect.width / 2,
            top: rect.top + rect.height / 2 - SPEND_LIFT,
          }]);
          const life = setTimeout(() => {
            spendLifeRef.current = spendLifeRef.current.filter((timer) => timer !== life);
            setPops((current) => current.filter((pop) => pop.id !== id));
          }, SPEND_LIFE_MS);
          spendLifeRef.current = [...spendLifeRef.current, life];
        }
        armSpend();
      };

      const refresh = React.useCallback(async () => {
        if (account === undefined || account === null) {
          setPhase('unavailable');
          return;
        }
        setPhase((current) => (current === 'ready' ? current : 'loading'));
        let view = null;
        try {
          const answered = await account.getState();
          if (!active.current) return;
          if (answered.ok) view = answered.value;
          else setError(messageOf(answered));
        } catch (cause) {
          if (!active.current) return;
          setError(messageOf(cause));
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
            setError(messageOf(answered));
            setPhase('failed');
            return;
          }
          const value = answered.value;
          setBalance(value);
          setAt(Date.now());
          if (value !== null && typeof value === 'object' && value.status === 'ready') {
            setError(null);
            setPhase('ready');
            /**
             * Queue whatever this read lost since the last one. The first ready
             * read only sets the baseline, a top-up raises it silently, and a
             * failed read never moves it — so a popup only ever prints real spend.
             */
            const walletRows = walletsOf(value);
            const total = totalMicros(walletRows);
            currencyRef.current = headline(walletRows)?.currency ?? null;
            const previous = totalRef.current;
            totalRef.current = total;
            if (previous !== null && total !== null && total < previous) {
              queueSpend(previous - total);
            }
          } else {
            setError('the Platform wallet read failed');
            setPhase('failed');
          }
        } catch (cause) {
          if (!active.current) return;
          setError(messageOf(cause));
          setPhase('failed');
        }
      }, [account, readLocale]);

      refreshRef.current = refresh;

      React.useEffect(() => {
        refreshRef.current();
        const timer = setInterval(() => { refreshRef.current(); }, POLL_MS);
        const onVisible = () => {
          if (document.visibilityState === 'visible') refreshRef.current();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
          clearInterval(timer);
          document.removeEventListener('visibilitychange', onVisible);
        };
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
              id: null, phase: null, url: null, error: messageOf(answered), opening: false, popupBlocked: false,
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
            id: null, phase: null, url: null, error: messageOf(cause), opening: false, popupBlocked: false,
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

      React.useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
          const host = hostRef.current;
          const panel = panelRef.current;
          if (host !== null && host.contains(event.target)) return;
          if (panel !== null && panel.contains(event.target)) return;
          setOpen(false);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true);
          document.removeEventListener('keydown', onKeyDown);
        };
      }, [open]);

      const rows = walletsOf(balance);
      const top = headline(rows);
      const busy = phase === 'loading';
      const signingIn = pendingPhase(signIn.phase) || signIn.opening;
      const amountText = top === undefined ? null : displayAmount(top);
      const chipState = signingIn ? 'pending' : phase;
      const stateText = signingIn ? t('waiting')
        : busy ? t('loading')
          : phase === 'signedOut' ? t('signedOut')
            : phase === 'failed' ? t('failed')
              : amountText === null ? t('failed') : null;
      const hint = phase === 'signedOut' ? t('signedOutHint')
        : phase === 'unavailable' ? t('unavailableHint')
          : error ?? (busy ? t('loading') : t('empty'));
      const summary = amountText === null
        ? `${t('label')} · ${stateText ?? t('failed')}`
        : `${t('label')} ${rows.map(displayAmount).join(' + ')}`;
      /** The dots say which window is open; the tooltip spells it out. */
      const described = `${summary} · ${t(offPeak ? 'offPeak' : 'peak')}`;

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

      const panel = open ? h('div', {
        ref: panelRef,
        className: 'dsh-sidebar-balance_panel',
        role: 'dialog',
        'aria-label': t('label'),
        style: origin === null ? { visibility: 'hidden', bottom: 56, left: 8 } : { top: origin.top, left: origin.left },
      }, [
        signingIn
          ? h('div', { key: 'waiting' }, [
            h('div', { key: 'title', className: 'dsh-sidebar-balance_row' }, t('waiting')),
            h('div', { key: 'text', className: 'dsh-sidebar-balance_note' },
              signIn.popupBlocked === true ? t('popupBlocked') : t('waitingHint')),
          ])
          : rows.length > 0
            ? h('div', { key: 'wallets' }, rows.map((row) => h(WalletRow, { key: `${row.kind}-${row.currency}`, row, t })))
            : h('div', { key: 'hint', className: 'dsh-sidebar-balance_note' },
              phase === 'signedOut' ? t('signInHint') : hint),
        error !== null && !busy && !signingIn && rows.length > 0
          ? h('div', { key: 'error', className: 'dsh-sidebar-balance_error' }, error)
          : null,
        signIn.error !== null
          ? h('div', { key: 'signInError', className: 'dsh-sidebar-balance_error' }, signIn.error)
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
            disabled: busy,
            title: t('refresh'),
            'aria-label': t('refresh'),
            onClick: () => { refreshRef.current(); },
          }, h(RefreshIcon, { size: 14, spinning: busy })),
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
          title: described,
          onClick: () => { setOpen((value) => !value); },
        }, [
          h('span', { key: 'icon', className: 'dsh-sidebar-balance_icon' }, h(WalletIcon, { size: wide ? 16 : 18, offPeak })),
          wide ? h('span', { key: 'label', className: 'dsh-sidebar-balance_label' }, t('label')) : null,
          wide && amountText !== null ? h('span', { key: 'amount', className: 'dsh-sidebar-balance_amount' }, amountText) : null,
          wide && stateText !== null ? h('span', { key: 'state', className: 'dsh-sidebar-balance_state' }, stateText) : null,
        ]),
        panel,
        h('div', { key: 'pops', className: 'dsh-sidebar-balance_pops' },
          pops.map((pop) => h('span', {
            key: pop.id,
            className: 'dsh-sidebar-balance_pop',
            style: { left: pop.left, top: pop.top },
          }, pop.text))),
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
