# 官网发布记录

目标：https://bojian.kelance.cn 。用户明确授权上线并再次确认目标域名。

## 当前版本：2026-10-21 · website-20261021-r5

按用户要求精简首页：背景铺满整个视口，透明导航和页脚叠加于照片；中央仅保留一句主标题。移除说明文案、功能切换、侧栏、创作者卡片和重复按钮，下载与登录仅在顶部出现一次。手机图片按实际裁切所需宽度加载，避免放大模糊。首页组件改为服务端组件。

- 在项目中本地 Docker 构建 `linux/amd64` 镜像，经容器验证后上传服务器加载和切换。服务器没有执行构建。
- 镜像：`bojian-website:website-20261021-r5`。
- 本地与服务器镜像标识一致：`sha256:089ad4177b592c1421c1759bd797541319635795c09e0fd7c22c850584095c8d`。
- 镜像包 SHA256：`7c71328fadd6c1e18320db03dc55891d3b48892646beda5cadb7e6559b6656c2`。
- 生产构建、5 项页面测试和 13 项认证/控制台测试通过；图片尺寸调整后的最终 Docker 构建、本地容器及公网浏览器验收通过。
- 验证桌面/手机背景全屏覆盖、唯一顶部入口、通知、控制台导航尺寸、扫码登录、法律页面及元数据；浏览器无异常或 HTTP 错误响应。
- 生产容器 healthy、重启 0；其他容器 ID 与镜像未变，kelance.cn 首页与发布前逐字节一致。
- 代码基于 `bc483436a58cf0d0c0aa88cc2ab9c61902464aee` 与当前未提交工作区改动，未推送源码。
- 本地证据：`artifacts/website-20261021-r5/`；服务器目录：`/home/ubuntu/bojian-releases/website-20261021-r5`。

回滚到 r4：

```sh
sh /home/ubuntu/bojian-releases/website-20261021-r5/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261021-r5/compose.override.yaml`。

## 历史版本：2026-10-21 · website-20261021-r4

本次基于 `bc483436a58cf0d0c0aa88cc2ab9c61902464aee` 与当前工作区改动构建，未提交或推送这些改动。

- 按用户参考图使用同款 James Wheeler / Pexels #417074 梦莲湖照片，采用白色标题、青绿色侧栏、底部三项可切换的功能介绍与创作者入口。来源及许可见 `docs/assets.md`。
- 保留首页与控制台一致的公共导航，下载仍显示“暂未上线”通知。手机采用竖向裁切和堆叠布局。
- 在项目中通过 Docker 构建 `linux/amd64` 成品镜像，完成本地容器验收后上传；服务器仅加载、预检及切换官网，没有执行构建。
- 镜像：`bojian-website:website-20261021-r4`。
- 本地与服务器镜像标识一致：`sha256:03b682e45b3741965aed1e332ef2b10a7d9c3883d24d398ffb7ff6e93d5167bc`。
- 镜像压缩包 SHA256：`7b2987a6136ec64b9eb1596e062893ba377a08a67ee1bf3c4cc0fbfc3ae806f0`。
- 服务器发布目录：`/home/ubuntu/bojian-releases/website-20261021-r4`；本地证据：`artifacts/website-20261021-r4/`。
- 生产构建、5 项页面测试、13 项认证与控制台测试通过；最终底部布局调整后再次通过构建和 5 项页面测试。
- 本地 Docker 容器及公网 Chrome 验证通过：背景加载、功能介绍切换、桌面/手机布局、下载通知、控制台导航一致性、登录返回目标、真实二维码创建与轮询、法律页面、搜索元数据和分享图。公网后端 health/ready 与管理入口返回 200，无浏览器异常或 HTTP 错误响应。
- 正式容器 `healthy`、重启数 0，其余容器 ID 与镜像未变；`kelance.cn` 首页与发布前逐字节一致。

回滚到此前上线的 `website-20261021-r3`：

```sh
sh /home/ubuntu/bojian-releases/website-20261021-r4/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261021-r4/compose.override.yaml`。

## 历史版本：2026-10-21 · website-20261021-r3

本次基于 `bc483436a58cf0d0c0aa88cc2ab9c61902464aee` 与当前工作区改动构建，未提交或推送这些改动。

- 下载按钮改为“暂未上线”通知，3 秒自动消失，支持 Esc 与重复触发重新计时；首页中央和导航共享同一通知。
- 首页增加产品说明、中央登录/下载按钮和三个图标功能模块，强化文字对比度、柔和渐变与页脚分隔；手机卡片纵排，短屏自然滚动。
- 控制台导航复用首页的宽度、左右留白、高度、白色背景及下载入口，保留账号菜单。
- 项目中维护 `Dockerfile`、`.dockerignore`、`deploy/build-image.sh`、`deploy/compose.website.yaml`、`deploy/deploy-image.sh`、`deploy/load-and-switch.py` 和 `deploy/smoke.mjs`。
- 在本机 Colima Docker 内构建 `linux/amd64` 镜像，经本地容器验收后通过 SSH 上传；服务器仅执行校验、`docker load`、预检及 Compose 切换，没有构建镜像。
- 镜像：`bojian-website:website-20261021-r3`。
- 本地与服务器镜像标识一致：`sha256:e4f40d00ca03cf942f4e77188cecf34f57bed6f33f9521b8766e6f575bc53488`。
- 镜像压缩包 SHA256：`cc3724594ab303a4cc62cc604af57065fcb6d7e51586a5a1433c6df1fe3e30d7`。
- 服务器发布目录：`/home/ubuntu/bojian-releases/website-20261021-r3`；本地证据：`artifacts/website-20261021-r3/`。
- 生产构建、5 项页面测试和 13 项认证/控制台测试通过；测试比较登录后首页与控制台导航的实际位置和尺寸，并检查控制台下载入口与背景。
- 本地成品镜像及公网 Chrome 验收通过：桌面/手机布局、通知自动消失、控制台导航一致性、登录返回目标、真实二维码生成和轮询、法律页面、搜索元数据及分享图。公网后端 health/ready 与管理后台入口返回 200，无浏览器异常或 HTTP 错误响应。
- 正式容器 `healthy`、重启数 0；其余生产容器 ID 与镜像未变；`kelance.cn` 首页与发布前逐字节相同。没有操作正式账号的登录确认或发布模板。

本次回滚到此前上线的 `website-20261021-r1`：

```sh
sh /home/ubuntu/bojian-releases/website-20261021-r3/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261021-r3/compose.override.yaml`。新的发布使用 README 中的本地构建、上传流程和全新发布名。

## 历史首发：2026-10-21 · website-20261021-r1

### 版本与部署

- 源码提交：`bc483436a58cf0d0c0aa88cc2ab9c61902464aee`，发布时与 GitHub `main` 一致。
- 从 Git 提交创建独立快照，仅在快照的 Next.js 配置中增加 `output: "standalone"`，不包含本地环境文件。
- 服务端发布目录：`/home/ubuntu/bojian-releases/website-20261021-r1`。
- 镜像：`bojian-website:website-20261021-r1`。
- 镜像 ID：`sha256:99bdc2c024f83eb7d79c2ed900e158a1793e1648438d562cd5ab52c3d629867f`。
- 使用旧官网镜像内现有 Node.js 22 运行环境，独立安装锁定依赖并完成 Linux 生产构建；运行镜像替换 `/app` 为新 standalone 产物及静态资源。
- 保留原有 Compose 覆盖文件，仅追加本次官网配置并执行 `up -d --no-deps --no-build --wait website`。官网继续采用只读文件系统、非 root 用户，缓存和临时目录使用 tmpfs。
- `BOJIAN_APP_AUTH_ORIGIN` 与 `BOJIAN_WEBSITE_ORIGIN` 均为 `https://bojian.kelance.cn`。Caddy 配置与域名未改动。
- 旧官网镜像 `bojian-website:latest` 保留；其他所有生产容器的 ID 和镜像均与发布前一致。`kelance.cn` 首页发布前后内容逐字节一致。

### 验证

- 本地生产构建及 TypeScript 通过；5 项页面测试、13 项认证及控制台测试通过。
- 服务器生产构建通过；先启动独立预检容器，检查主要页面、真实后端二维码创建和状态查询，再切换官网。
- 公网 Chrome 验证桌面和 390px 手机首页、控制台登录链接及返回目标、二维码生成（201）与等待状态轮询（200），无浏览器异常或 HTTP 错误响应。
- 隐私政策、用户协议、App 登录提示、模板制作指南、robots、sitemap、分享图、后端 health/ready 和管理后台入口均返回 200。
- 正式官网容器状态 `healthy`，重启数为 0。此次未使用真人账号完成 App 确认或正式模板发布；对应业务流程由隔离回归测试覆盖。
- 本地浏览器截图与验收结果位于 `artifacts/website-release-20261021-r1/`；服务器保留构建日志、发布前后容器清单、镜像 ID、源码包及 SHA256 文件。

### 历史版本回滚

服务器执行：

```sh
sh /home/ubuntu/bojian-releases/website-20261021-r1/rollback.sh
```

该脚本使用原有 Compose 文件集合，仅恢复官网服务至保留的旧镜像，不操作数据库或其他服务。重新部署本次版本可执行同目录的 `deploy.sh`。

后续整体 Compose 操作应包含本次 `compose.override.yaml`，避免基础配置中的 `bojian-website:latest` 将官网恢复为旧版本。
