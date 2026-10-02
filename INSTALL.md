# 安装 `@local/dsh-sidebar-balance`

在 DeepSeek Harness 的侧栏底部加一个余额条：显示 DeepSeek 账号余额、DeepSeek
的计费高峰/空闲时段，以及每次真实扣费的消耗数字弹出。

- 侧栏「设置」上方一条：钱包图标 + `余额` + 金额，点开是账户面板（充值/赠金余额、
  刷新、用量与充值入口、登录）。
- 钱包图标里两颗点：**红点闪 = 计费高峰，绿点闪 = 空闲优惠**（UTC 01:00–04:00、
  06:00–10:00，周一至周五，中国法定节假日除外）。
- 余额真的减少时，扣款金额会拆成一串数字从钱包上方飘出（每 1–1.4 秒一个）。

## 安装方式

### 方式一：Harness 网页里装（推荐）

1. 打开 Harness 的网页界面（手机上是 DSH 应用里的页面）。
2. 进入**插件**页（Plugin Manager），点**安装**。
3. 在安装输入框里粘贴下面任意一种位置，然后确认安装：
   - 本机上的压缩包绝对路径，例如
     `/sdcard/Download/dsh-sidebar-balance-1.0.0.tgz`；
   - 解压出来的目录绝对路径，例如 `/sdcard/Download/dsh-sidebar-balance`；
   - 一个 Git 地址，例如
     `https://github.com/WXJ-71/dsh-sidebar-balance`。
4. 安装完成后，在插件列表里确认 `@local/dsh-sidebar-balance` 这一项已启用。
5. 刷新页面，侧栏底部就会出现余额条。

### 方式二：命令行

```sh
# <spec> 同上：压缩包路径 / 目录路径 / git 地址
dsh plugin --profile web add <spec>
```

这一步只把包装进 profile，装完还要在**插件页**里把
`@local/dsh-sidebar-balance` 这个 bundle 启用，或者重启 Harness。

## 需要什么

| 项目 | 说明 |
| --- | --- |
| 适用系统 / 界面 | Harness 的 **Web 界面**（`dsh web` / `dsh --profile web`）：手机浏览器、安卓 DSH 应用内嵌页面、桌面浏览器都可。清单里声明 `dsh.client.platform: "web"`。 |
| Harness | `^0.1.7-rc.2`，也就是 0.1.7 起到 0.2.0 之前的版本（已在 0.1.7-rc.2 实测）。用到 `sidebar.footer.action` 槽位和 `remote.account`（账户 Remote）。 |
| 兼容性声明 | 本包声明了 `peerDependencies: { "@deepseek-ai/dsh": "^0.1.7-rc.2" }`，Harness 版本不在这个范围时**插件页会直接拒绝安装**并提示版本不兼容，而不是装上去之后悄悄不工作。它同时把该 peer 标为 `optional`，所以 pnpm 不会去公网下载一份完整的 dsh 运行时。 |
| 账号 | 余额要登录后才显示。点侧栏那条的「登录」，会在新标签页打开 DeepSeek 开放平台，授权后余额自动出现。 |
| 网络 | 余额由 Harness 的 Host 去 `platform.deepseek.com` 读取；插件本身不直连。 |

## 包内容

| 文件 | 作用 |
| --- | --- |
| `package.json` | bundle 清单：`dsh.bundle.patch`、卡片图标、`locale/*.json` 导出、Client 声明。 |
| `cordis.patch.yml` | 插入本包的 Host 行。 |
| `index.js` | Host 半边，不渲染任何东西。 |
| `client.js` | 浏览器半边：侧栏余额条、账户面板、登录流程、钱包图标、计费时段双点、消耗弹出、内联样式与中英文字典。 |
| `icon.png` | 插件列表里的图标。 |
| `locale/zh.json`、`locale/en.json` | 插件卡片上的标题与描述。 |
| `LICENSE` | MIT 许可证。 |
| `README.md` | 技术说明（渲染位置、时段判定规则、维护注意事项）。 |

包名里的 `@local/` 是「本地」作用域，用路径或 git 安装都没问题；如果要发布到 npm，
先把 `name` 改成你自己的作用域（例如 `@your-name/dsh-sidebar-balance`）。

## 卸载

在插件页里移除该 bundle（或 `dsh plugin --profile web remove @local/dsh-sidebar-balance`）。

## 看不到东西时

- **侧栏没有变化**：确认插件页里这一项是启用的，然后刷新页面。
- **有余额条但金额是「未登录」**：点开面板登录 DeepSeek 账号。
- **图标位置或颜色不对**：插件页读取的是包内 `icon.png`；换图后要刷新页面。
- **提示版本不兼容**：当前 Harness 版本不在 `^0.1.7-rc.2` 范围内。要么升级/降级
  Harness，要么在插件管理器里对该插件授权「版本例外」后重试。
- **数字弹出不出现**：它只在**余额真的变少**时出现，而且要比上一次读到的余额低
  才会触发；不消费的时候不会有任何数字。
