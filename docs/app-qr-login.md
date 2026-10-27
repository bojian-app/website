# 博简 App 扫码登录：官网对接

官网代码位于 `~/bojian/website`。按照已有后端 `docs/app-qr-login.md`、`internal/httpapi/app_qr_login.go` 与 `docs/examples/app-qr-login.mjs` 实际契约接入；后端任务关联 `fahnzjan/bojian-mobile#32`。

## 配置

`.env.example` 提供正式 API 来源，本地 `.env.local` 已配置同一来源：

```dotenv
BOJIAN_APP_AUTH_ORIGIN=https://bojian.kelance.cn
# 生产环境经过 HTTPS 反向代理时设置，开发环境留空。
# BOJIAN_WEBSITE_ORIGIN=https://bojian.kelance.cn
```

变量仅在服务端使用，不带 `NEXT_PUBLIC_`。不要在 API 来源后追加 `/api/v1`。上游必须 HTTPS，只有本机集成测试可用 loopback HTTP。请求禁止跟随重定向，来源不能含路径、凭据或查询。

## 官网同源接口

使用 `/web-api/auth/*`，避免被当前 Caddy 的 `/api/* → 后端` 规则截走，无需修改后端代理配置。

| 方法与路径                         | 用途                                                     |
| ---------------------------------- | -------------------------------------------------------- |
| `POST /web-api/auth/qr`            | 同意后生成二维码，请求体 `{ "agreementAccepted": true }` |
| `GET /web-api/auth/qr?attempt=...` | 查询当前浏览器、当前二维码状态                           |
| `POST /web-api/auth/qr/exchange`   | App 确认后兑换会话，请求体 `{ "attempt": "..." }`        |
| `GET /web-api/auth/session`        | 校验会话，按需刷新令牌，返回最少账号资料                 |
| `POST /web-api/auth/logout`        | 撤销官网独立会话后清理本地凭据                           |

全部响应 `private, no-store`。POST 检查精确 Origin、JSON 类型，创建与交换的输入流限制 1KB。反向代理场景应设置精确公开 `BOJIAN_WEBSITE_ORIGIN`，本地使用浏览器 Host 比对，不能用 Next 内部 localhost 代替浏览器实际来源。

## 对应后端接口

全部扫码操作是 POST。创建、状态、交换及令牌刷新统一携带：

```http
X-Device-Id: web:<随机且持久的浏览器设备ID>
X-Platform: WEB
X-App-Version: 1.0.0
User-Agent: <实际浏览器User-Agent>
```

设备 ID 在官网 HttpOnly Cookie 中持久保存。同一轮扫码与后续刷新沿用同一个设备 ID。

| 后端路径                                          | 官网发送的 JSON                                          |
| ------------------------------------------------- | -------------------------------------------------------- |
| `/api/v1/auth/app-qr-sessions`                    | `{"agreement_versions":{"terms":"1.0","privacy":"1.0"}}` |
| `/api/v1/auth/app-qr-sessions/{session}/status`   | `{"browser_token":"..."}`                                |
| `/api/v1/auth/app-qr-sessions/{session}/exchange` | `{"browser_token":"..."}`                                |
| `/api/v1/auth/token/refresh`                      | `{"refresh_token":"..."}`                                |
| `/api/v1/auth/logout`                             | `{}`，Bearer 为官网独立会话                              |
| `/api/v1/me`                                      | GET，Bearer，仅向页面返回 id、nickname、public_id、avatar_url        |

创建读取 `session_id/browser_token/qr_content/expires_at/poll_after_seconds`。官网验证 43 字符随机 ID、凭据及后端约定的二维码格式后，**将 qr_content 原样编码**：

```text
https://bojian.kelance.cn/app-login#v=1&session=<session_id>&token=<scan_token>
```

不会把私有 browser_token 放入二维码。`/app-login` 提供系统浏览器误开时的简短提示，不做授权，并清除地址栏 fragment，不将扫码凭据上传。

二维码由 `qr-code-styling` 1.9.2 在服务端生成 SVG，使用蓝色渐变、纯圆点、圆角定位框及 H 级纠错，无中央 Logo。每次生成后释放 JSDOM 窗口，浏览器继续通过 `qrDataUrl` 展示；扫码内容与登录接口协议不变。

后端状态映射：WAITING → 等待；SCANNED → App 确认中；CONFIRMED → 只兑换一次；EXPIRED → 自动生成新的二维码；CANCELED/EXCHANGED → 停止轮询并允许重试。等待扫码时不显示状态、倒计时或手动刷新按钮。登录成功后直接返回首页，已有会话访问登录页也会返回首页。两秒串行查询，隐藏页暂停，离开、取消、过期、刷新时清理请求与定时器。刷新创建新的请求，旧 attempt 不会操作新二维码。

## 会话

access、refresh 和二维码 browser_token 都只在服务端 HttpOnly Cookie 内，生产 Secure、SameSite=Strict、Path=/web-api/auth；不返回客户端 JSON，不写 localStorage、URL、日志。接口返回账号资料前用 `/me` 校验。上游 token 过期时调用实际刷新接口，并保存轮换后的凭据；后端撤销/失效时清除会话。不同标签页只广播状态变更，不传令牌。

当前是单个 Next.js 实例。并发刷新按来源、设备和旧 refresh token 的哈希合并，只共享同一凭据的一次请求，成功结果保留五秒处理并发响应后清理，最多 1024 项。若以后部署多个实例，需共享会话/分布式刷新协调，不能直接把这个进程内协调当作跨实例锁。

退出仅撤销官网 WEB 会话，保留 App 会话。暂时性错误不会显示退出成功；刷新已成功但后续资料接口临时错误时仍保存轮换凭据，避免丢失有效会话。

## 验证

```sh
pnpm build
pnpm test:auth
```

测试在独立 Node 进程启动与现有后端契约一致的模拟服务，严格检查路径、POST JSON、设备/版本头、状态大小写、一次性兑换与刷新轮换。浏览器验证扫码、确认、退出、过期、取消、已使用状态、移动布局；截图中的二维码会实际解码检查。测试不写生产环境配置，不调用生产账号授权，没有生产模拟开关。

macOS 默认使用 Google Chrome；其他环境设置 `BOJIAN_TEST_BROWSER` 或安装 Playwright Chromium。`*-test-fixture.png` 是受控测试账号与二维码，只用于验收。

## 实际服务可用性

2026-10-20 已按用户追加授权发布服务端，镜像 `bojian-api:app-qr-login-20261020-r1`，自动执行迁移 `052_app_qr_login.sql`。保留现有百度核身配置，发布前后服务环境变量一致；只重建 API 容器。正式健康与就绪检查均为 200，新接口已进入公开 OpenAPI 文档。

直接请求正式 API：创建返回 201/WAITING，状态查询返回 200/WAITING；缺协议、未确认兑换、错误浏览器设备、错误私有凭据和匿名 App 确认均被拒绝。官网本地 `http://127.0.0.1:3005/login` 已实际生成正式二维码并持续查询状态。

用户已使用已安装的博简 App 扫码并确认；生产记录显示二维码于 2026-10-20 10:37:07 UTC 完成 EXCHANGED，并在同一事务创建独立 WEB 会话，真实扫码登录链路已核实。

本次实机没有继续测得页面重载和令牌续期：用户确认的是另一浏览器会话，受控验收窗口中的二维码随后过期，未观察到该窗口登录；因此不能把其记录当作重载/续期成功。上述行为已通过官网严格契约自动化测试和真实数据库服务端测试。新官网尚未替换服务器上的旧官网。


### 账号头像

`/api/v1/me` 的 `avatar_url` 映射为客户端 `avatarUrl`，扫码兑换和会话恢复都返回同一资料结构。签名图片地址保留原查询参数，浏览器直接加载，不经过 Next 图片优化缓存，并设置 no-referrer。无头像或图片加载失败时回退昵称首字；新头像 URL 到达时可恢复图片。不会向浏览器返回额外个人资料。
