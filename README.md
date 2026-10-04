# dsh-sidebar-balance

给 DeepSeek Harness 的侧边栏底部加一条余额：账号余额、计费时段提示、消耗数字弹出。
包名 `@local/dsh-sidebar-balance`，插件页显示为 **侧边栏余额** / **Sidebar Balance**。

![插件图标](icon.png)

- **余额常在眼前** — 侧栏「设置」上方一条 `余额 ¥12.34`，点开是账户面板：充值余额与赠金余额、刷新、用量/充值入口，以及浏览器内的 DeepSeek 账号登录。
- **计费时段一眼可辨** — **钱包图标红色 = 计费高峰，绿色 = 空闲优惠**（UTC 01:00–04:00 与 06:00–10:00，周一至周五，中国法定节假日除外；节假日按空闲计）。
- **消耗数字弹出** — 余额真的减少时，这笔扣款会拆成一串 `-¥0.0031` 从钱包上方连续飘出，每 1–1.4 秒一个、每个停留 1.6 秒，**加总正好等于这次真实扣款**；不消费就不弹。

## 安装

在 Harness 网页的**插件页 → 安装**里粘贴这个地址：

```
https://github.com/WXJ-71/dsh-sidebar-balance
```

命令行等价写法：

```sh
dsh plugin --profile web add https://github.com/WXJ-71/dsh-sidebar-balance
```

装完在插件列表里启用 `@local/dsh-sidebar-balance`，刷新页面即可。完整步骤、依赖要求、
卸载与排查见 [INSTALL.md](INSTALL.md)。

## 适用环境

| 项目 | 说明 |
| --- | --- |
| 适用系统 / 界面 | DeepSeek Harness 的 **Web 界面**（`dsh web` / `dsh --profile web`）：手机浏览器、安卓 DSH 应用内嵌页面、桌面浏览器都适用。清单里以 `dsh.client.platform: "web"` 声明，不依赖任何桌面端组件。 |
| Harness 版本 | **`^0.1.7-rc.2`** —— 0.1.7（含 `-rc` 预发布）起、0.2.0 之前。已写进 `package.json` 的 `peerDependencies`：版本不符时**插件页直接拒绝安装**并提示版本不兼容，不会出现「装上了却不工作」。核验方式见 [INSTALL.md](INSTALL.md#需要什么)。 |
| 已验证版本 | `0.1.7-rc.2`（开发与实测环境：安卓 DSH 应用 + 手机浏览器） |
| 依赖 | 无。只用 Harness 自带的 `sidebar.footer.action` 槽位与账户 Remote，不引入任何第三方包 |
| 账号 | 需要 DeepSeek 开放平台账号：余额由 Harness 的 Host 读取，登录在浏览器里完成（授权回调落在本机回环地址） |
| 网络 | 插件本身不直连平台；只有 Host 读余额、以及你点「登录」时才访问 `platform.deepseek.com` |

## 许可

[MIT](LICENSE)。

---

*以下为技术说明（English）。*

# @local/dsh-sidebar-balance

Display name in the plugin page: **侧边栏余额** / **Sidebar Balance** (from
`locale/zh.json` and `locale/en.json`; without them the card falls back to the
raw package name).

Shows the DeepSeek account balance at the foot of the Harness sidebar, above the
Settings row, and signs the Harness into a DeepSeek Platform account from the
browser. It reads the built-in account Remote (`account.getState`,
`account.getBalance`, `account.startSignIn`, `account.cancelSignIn`), so it never
talks to the Platform itself and needs no configuration.

## Why this plugin exists

The shipped account UI (`@deepseek-ai/dsh-client-ui-settings-account`) registers
only in the Desktop renderer — its `apply()` starts with
`if (!("dshDesktop" in globalThis)) return`. In a browser profile there is
therefore no account page and no way to sign in, even though the Host half
(`dsh-deepseek-account-platform`) supports a `loginSource: 'web'` PKCE flow whose
callback lands on the loopback Web server. This plugin adds the missing entry
point.

## Where it renders

One entry in the `sidebar.footer.action` slot (`id: account-balance`):

- **signed in** — wallet glyph (see `WalletIcon`: a 1.25:1 billfold with a snap
  clasp, drawn from the owner's two reference icons), `余额`/`Balance`, and the
  topped-up amount (`¥12.34`, or `<0.01` for a positive sub-cent balance);
  clicking opens a panel with the topped-up and granted wallets, a refresh
  action, and the account's Usage / Top-up links.
- **signed out** — wallet glyph with `未登录`/`Not signed in`; the panel offers
  `登录`/`Sign in`.
- **signing in** — the state reads `等待登录完成…`/`Waiting for sign-in…` in the
  brand color while an attempt is in flight, with `打开授权页` and `取消` actions.
- **read failed** — the state turns into the error color and the panel carries
  the Remote error text; polling keeps retrying.
- **collapsed sidebar** — a 36px circular icon-only button, like the Cordis
  panel beside it.
- **billing indicator** — the wallet glyph itself is tinted by the window that
  is open right now: red for peak, green for off-peak, in both themes and in the
  icon-only rail chip as well. The chip's tooltip names the window
  (`· 计费高峰时段` / `· 空闲优惠时段`).

- **spend popups** — when a read shows the wallet shrank, that drop floats above
  the wallet as `-¥0.0031` style numbers: one every 1-1.4s, each rising and fading
  over 1.6s, so the next number is already up before the previous fades. What one
  read lost is what its popups add up to.

State refreshes on mount, every 60 seconds, and whenever the tab becomes
visible. While a sign-in attempt is pending the cadence is 2 seconds, so the
chip flips to the balance by itself once the browser finishes.

## The billing indicator

DeepSeek bills the standard rate in two UTC windows, Monday to Friday, and the
discount rate in every other hour — **weekends and Chinese public holidays in
full** ([pricing](https://api-docs.deepseek.com/quick_start/pricing)):

| Rate | When (UTC) |
| --- | --- |
| peak (wallet red) | 01:00–04:00 and 06:00–10:00, Mon–Fri, except CN holidays |
| off-peak (wallet green) | every other hour, all weekend, and every CN holiday |

`peakAt(date)` in `client.js` is a pure function of the instant, so the tint is
right whenever the page re-renders, and `useOffPeak` only exists to re-render at
the edges: one timer re-arms for the next 00:00/01:00/04:00/06:00/10:00 UTC
boundary, and a `visibilitychange` listener re-reads the clock because phones
freeze timers while the tab is backgrounded. The window is evaluated in UTC, so
the device's own timezone never changes the tint.

Holidays come from the State Council's yearly arrangement, listed per year in
`CN_HOLIDAYS` as `MM-DD` (2026 is 国办发明电〔2025〕7号). The table is the one
part that goes stale: a year that is missing falls back to the weekday rule,
which claims peak on a holiday rather than promising a discount that is not
there. Add the next year's dates from
<https://www.gov.cn/zhengce/zhengceku/> when they are published each November.
Shifting a weekend to a workday does not matter: DeepSeek bills weekends
off-peak in full, `调休` or not.

`prefers-reduced-motion` has nothing to switch off here: the tint is static, so
the window reads the same either way.

The tint is the theme's own state token, painted through `currentColor`:
`--dsw-alias-state-error-primary` for peak and `--dsw-alias-state-success-primary`
for off-peak. Every stroke of the glyph carries it, so the wallet reads as one
colour rather than a tinted detail. Reusing the tokens keeps it legible in light
and dark without a colour of its own, and the icon-only rail chip takes the same
tint — there it is the only signal the chip has.

Two rules set it, and they sit after `.dsh-sidebar-balance_icon` in the sheet so
they win on the element they share with it. The wallet's blank left panel, which
used to hold the billing dots, stays blank.

## Spend popups

The popups ride the reads the chip already makes — no extra Platform traffic.
Each ready read totals every wallet row (`toppedUp` plus any positive
`bonusWallets`) in millionths of the wallet currency and compares it with the
previous read. The first ready read only sets the baseline, a top-up raises it
silently, and a failed read leaves it alone, so a popup only ever prints real
spending.

A detected drop is queued, and one popup every 1-1.4s removes a share of it:

- The share is sized when the drop is queued (`ceil(queue / SPEND_PIECES)`), not
  per popup, so a drop drains over about 50 popups — the read interval divided by
  the cadence, so one 60s read's spending lasts about 60s of popups instead of
  emptying in a burst and leaving the rest of the minute blank. Sizing per popup
  would decay geometrically instead.
- The cadence (1-1.4s) is deliberately shorter than the 1.6s life, so one or two
  numbers are in the air at a time and the column reads as a continuous stream.
- The last popup of a queue takes the remainder, so the popups of one read add up
  to exactly that read's drop, and the arithmetic never leaves the integer
  millionths.
- Shares under `SPEND_MIN_MICROS` (0.0001) wait in the queue rather than printing
  a row of zeros.

Text is a minus, the wallet's own currency symbol (`symbolOf`), and as few
decimals as the share needs (two at the least, four at the most) — no other words.
It is positioned from the chip's live bounding rect in a fixed,
`pointer-events: none` layer at `z-index: 35`, anchored `SPEND_LIFT` (34px) above
the chip's **centre** — so the 36px rail chip, whose 18px glyph sits higher, keeps
the same clearance as the 42px wide chip. The first frame leaves the digits about
half a line box above the wallet glyph's top edge, and neither the first nor the
last frame of the rise touches the button. It stays under the account panel (40)
without touching the sidebar's layout. The style is
the error token deepened for contrast (`--dsw-alias-state-error-primary` mixed
20% toward black, with the plain token declared first as a fallback), 12px at
weight 500,
tabular figures, plus a soft shadow in the sidebar's own fill so the number stays
legible over whatever it floats across.

`prefers-reduced-motion` drops the float; the number then simply holds its place
for 1.6s. `SPEND_PIECES`, `SPEND_GAP_MS`, `SPEND_LIFE_MS`, `SPEND_MIN_MICROS`, and
`SPEND_LIFT` are the knobs — a slower drip, a longer life, a bigger queue floor,
or more clearance over the chip.

## The sign-in flow

1. The panel's `登录`/`Sign in` action calls
   `account.startSignIn(client, window.location.origin, 'web')`.
2. The Host runs the PKCE attempt, registers the browser callback route
   `/oauth/callback` on its Web server, and returns the attempt with an
   `authorizeUrl`; the plugin opens it in a new tab.
3. Platform approval redirects the tab to
   `http://127.0.0.1:<port>/oauth/callback?code=…&state=…`, which the Host
   exchanges and stores as the `deepseek-account-platform/default` grant.
4. The next 2-second poll sees `credential-stored`, reads the wallet, and the
   chip shows the amount.

`window.open` runs in the same turn as the click, so it is not treated as a
popup; if the browser blocks it anyway the panel says so and offers the
`打开授权页` button instead. Cancelling calls `account.cancelSignIn(attempt.id)`;
if the panel is closed mid-attempt the attempt stays alive on the Host and the
next poll adopts its id again.

## Files

- `package.json` — bundle manifest: `dsh.bundle.patch`, the display `icon`, the
  `locale/*.json` and `package.json` exports the metadata reader resolves, plus
  the Client declaration (`platform: web`, `immediately`, and the load-order
  `inject`).
- `cordis.patch.yml` — inserts the single Host row for this package.
- `locale/en.json`, `locale/zh.json` — the `meta.title` / `meta.description`
  shown on the plugin card and component rows.
- `icon.png` — the plugin-card artwork: a 241×256 RGBA PNG (90.9 KiB) cut down
  from a 1155×1229 source that already carries a transparent background. Only
  the plugin list, bundle list, and inventory rows read it; the sidebar chip
  keeps its inline wallet glyph in `client.js`.
- `index.js` — Host half; it renders nothing and owns no service.
- `client.js` — the browser half: the `sidebar.footer.action` registration, the
  chip and account panel, the spend popups, the sign-in flow, inline styles, the
  inline `WalletIcon` / `RefreshIcon` glyphs, the `peakAt` / `useOffPeak`
  billing-window helpers, and the `sidebar.balance` dictionaries (en/zh).

## Maintenance

`clientMetadata()` in `client.js` sends `x-client-version` to the Platform. It
pins the Harness version this bundle was authored against (`0.1.7-rc.2`); bump
it after upgrading the Harness.

`package.json` declares `peerDependencies: { "@deepseek-ai/dsh": "^0.1.7-rc.2" }`,
which is what the manager's compatibility preflight reads: outside that range the
plugin is refused at install time instead of failing silently later. The matching
`peerDependenciesMeta` entry marks it optional so a package manager never tries to
fetch a whole dsh runtime for it. Widen the range when the slot and account Remote
interfaces are confirmed on a newer line.

A `link:` install into a profile keeps this directory live: editing `client.js`
is picked up by Client HMR when the web dev watcher is running, and by a page
refresh otherwise. Changes to `cordis.patch.yml` rows need a bundle install (or a
Harness restart) to take effect. See `INSTALL.md` for the install itself.

The card icon is the exception, and it is not the case the note below covers:
`readPluginMeta` resolves `./package.json` once and then re-reads that file with
`readFileSync` on every call, inlining the icon bytes as a `data:` URL. So
replacing `icon.png` — or pointing `icon` at another file that already sits
inside the manifest directory — lands on the next plugin-list fetch, which the
page performs on mount. Adding the `icon` field, a new `exports` entry, or
`locale/*.json` for the first time is different: Node caches the package's
resolved exports map for the life of the process, so the running Harness keeps
reading the previous map — and therefore keeps showing the package-name and
default-artwork fallbacks — until `dsh web` is restarted. Verify new text or a
new icon address without waiting by calling `readPluginMeta` in a fresh process:

```sh
node --input-type=module -e "import { readPluginMeta } from '@deepseek-ai/dsh-app-boot'; \
  console.log(JSON.stringify(readPluginMeta('@local/dsh-sidebar-balance', 'file://' + process.env.DSH_PROFILE_DIR + '/'), null, 2))"
```

`icon.png` was cut from a 1155×1229 RGBA source with a transparent background:
fit to a 256px box with Lanczos, landing at 241×256 and about 89 KiB. The manifest
cap is 256 KiB, so a 512px render is refused and a 384px one only just fits.
Nothing else in this package depends on that source.

## Diagnosing a failed sign-in

The panel prints the Remote error verbatim. Useful mappings:

- `account start failed` / `protocol` — `startSignIn` rejected the callback
  origin. The Host accepts only `http://localhost|127.0.0.1|[::1]:<port>` with no
  path, and the authorize URL must be `<platformOrigin>/dsh/authorize`.
- `expired` — the attempt outlived `attemptTimeoutMs` (10 minutes by default) or
  the Browser was closed before consent.
- `network` — the Host could not reach `https://platform.deepseek.com`.
- `storage` — a stored grant exists but does not parse; `signOut` (or deleting
  the `deepseek-account-platform/default` record in `$DSH_HOME/.credentials.yaml`)
  clears it.
