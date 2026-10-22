# 官网发布记录

目标：https://bojian.kelance.cn 。用户明确授权上线并再次确认目标域名。

## 当前版本：2026-10-22 · website-20261022-r12

删除用户标记的三处内容：模板库上方标题和同步提示、列表底部说明、右侧模板制作指南卡片。模板列表与其他面板顶部对齐，保留导航及上传窗口中的指南入口。已上架模板新增“申请下架”，沿用后端申请及审核流程。

- 新增固定同源 POST `/web-api/auth/creator/templates/:id/unpublish`，只转发空对象到现有鉴权下架接口。保留后端归属和状态检查，验证响应 ID 和 `UNPUBLISH_REQUESTED` 状态，不允许通过客户端指定最终下架状态或作者。
- 申请前确认模板名称及审核流程；成功后刷新列表并显示“下架审核中”，失败展示真实错误。待下架及已下架状态不显示重复申请按钮；新增“下架审核中”和“已下架”筛选。状态列宽适配完整审核标签，窄屏保持卡片布局和可横向滚动的筛选栏。
- 构建并部署 `linux/amd64` 镜像 `bojian-website:website-20261022-r12`。本地与服务器镜像 ID 一致：`sha256:a0bf3059bf3e15e811c2b6c7158e47119d44ec481e6e2bc08782f9cf1c60de11`；镜像包 SHA256：`b4de36203813f212d837b7c49ee59d13d87a7117739f8cd6a8f10caf61712755`。
- 生产构建、14 项认证及控制台测试、5 项页面测试通过。覆盖下架登录及同源保护、归属、状态冲突、固定请求内容、重复申请、取消确认、失败提示、成功刷新和两种下架状态筛选。21 组状态及尺寸检查通过，多模板场景含下架审核中及已下架记录。
- 本地最终镜像及公网 1440px/390px 布局检查通过：三处内容消失、下架按钮按状态显示、审核标签不与定价重叠，发布日期/人数/PDF 入口及全屏外壳保持正常。布局验收使用模拟账号及模板数据；下架写入仅在隔离测试后端验证，没有向正式账号或模板提交下架申请。公网二维码、公共页面、后端 health/ready 检查通过，无浏览器异常或 HTTP 错误响应。
- 正式容器 healthy、重启 0，其他生产容器 ID 与镜像不变。未提交或推送源码。证据：`artifacts/website-20261022-r12/`；公网截图：`production/console-application-*.png`（示例数据）。

回滚至 r11：

```sh
sh /home/ubuntu/bojian-releases/website-20261022-r12/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261022-r12/compose.override.yaml`。

## 历史版本：2026-10-22 · website-20261022-r11

移除模板库上方的整个大幅模板预览面板，列表直接接在标题下。每个模板显示发布日期和使用人数，列表“查看预览”继续单击在新标签页打开完整 PDF。窄屏按条目展示带标签的日期、人数和定价。

- 使用现有鉴权模板详情接口的 `published_at`、`usage_count`，只对自有模板读取，并发上限 4。日期按北京时间显示；未发布模板显示“未发布”；人数采用有效简历所有者去重统计，真实 0 保留，统计读取失败显示“—”。不向浏览器转发详情中的 manifest 等无关字段，401 继续按会话失效处理。已只读检查线上后端二进制含对应字段和去重查询，无需更新后端服务。
- 构建并部署 `linux/amd64` 镜像 `bojian-website:website-20261022-r11`，本地与服务器镜像 ID 一致：`sha256:917a1b64e76da5819429be223599357a12d609f77c0f0749c2b875b9dfbbdf86`；镜像包 SHA256：`fbda7661c215682fe0002410f6fbfb8bb9826df534e87a6d8751360f287d8c73`。
- 生产构建、14 项认证及控制台测试、5 项页面测试通过。覆盖发布日期时区、正数/零人数、无效数据、统计失败回退、401、数据投影和 PDF 新页预览；21 组状态及屏幕尺寸布局检查通过。
- 本地镜像及公网桌面/手机布局检查通过，确认预览面板消失、日期与人数显示、筛选和 PDF 链接正常，整页外壳保持正常。布局验收使用模拟账号及模板数据，没有操作正式账号或模板。公网二维码创建、轮询、解码、health/ready 及公共页面检查通过，无浏览器异常或 HTTP 错误响应。
- 正式容器 healthy、重启 0，其他生产容器 ID 与镜像不变。未提交或推送源码。证据：`artifacts/website-20261022-r11/`；公网布局截图：`production/console-application-*.png`（示例数据）。

回滚至 r10：

```sh
sh /home/ubuntu/bojian-releases/website-20261022-r11/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261022-r11/compose.override.yaml`。

## 历史版本：2026-10-22 · website-20261022-r10

将控制台改为覆盖整个视口的应用布局。独立紧凑页头整合 Logo、页面导航、下载和账号入口；侧边导航贯穿页面，工作区占满剩余宽度并独立滚动，版权与法律链接改为应用内底栏。移除正文内部的重复导航和居中外框。制作指南共用同一应用外壳，返回首页时恢复公共网站页头、页脚和页面滚动。

- 新增控制台路由布局与按路由切换的公共外壳。桌面页头高 64px、侧栏宽 64px；手机页头高 56px，导航转为横向。手机图标下载按钮保留明确的无障碍名称。
- 本地构建 `linux/amd64` 镜像 `bojian-website:website-20261022-r10`，本地容器验收及服务器预检通过后，仅切换官网服务。
- 本地与服务器镜像 ID 一致：`sha256:082110931d0800e1b4b0903528346a2858b1d2dcbd1719adc98fd5a277739777`；镜像包 SHA256：`2822a129c13aff85a4369d89a9f8b21c20fd50513732a5cb11c54b3c0b7dd88f`。
- 生产构建、14 项认证及控制台测试、5 项页面测试通过。新增全屏外壳实际尺寸、指南滚动时页头固定、内部滚动区无横向溢出的检查；21 组状态及屏幕尺寸检查通过。
- 本地镜像与公网均验证桌面/手机整页布局、账号菜单、指南外壳、返回首页后滚动及页头还原；布局检查使用模拟账号、模板和缩略图，没有操作正式账号或模板。原登录、上传、审核、模板切换及 PDF 预览流程正常，公网二维码、health/ready 验收通过。
- 正式容器 healthy、重启 0，其他生产容器 ID 与镜像不变。未提交或推送源码。证据：`artifacts/website-20261022-r10/`；公网整页截图：`production/console-application-*.png`。

回滚至 r9：

```sh
sh /home/ubuntu/bojian-releases/website-20261022-r10/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261022-r10/compose.override.yaml`。

## 历史版本：2026-10-22 · website-20261022-r9

按用户提供的参考图改为浅灰背景、白色圆角面板、细边框与蓝色强调的紧凑多栏工作台。窄图标导航与顶部标签组织页面；左栏放作品概览和发布步骤，中栏放当前模板预览与管理表格，右栏放认证状态、待办提醒和制作指南。点击模板名称切换上方预览，待办按钮筛选对应状态；封面、查看预览及表格 PDF 入口均可直接打开完整 PDF。

- 本地构建 `linux/amd64` 镜像 `bojian-website:website-20261022-r9`，本地容器验收及服务器预检通过后，仅切换官网服务。
- 本地与服务器镜像 ID 一致：`sha256:23e0b4612271fcc2968f7ccdf4d981752c62498cf7e9801c0a3288ff50f02eb0`；镜像包 SHA256：`fbf792280292e690493a0fd62a7f0e23aa1051cc232368b9d3643252625d1eba`。
- 生产构建、14 项认证及控制台测试、5 项页面测试通过。单模板、多模板、空列表分别覆盖 320、390、768、900、1024、1440、1920px，共 21 组，无横向溢出；另验证模板选择、待办筛选及 PDF 链接随选中模板更新。
- 本地镜像与公网桌面/手机验收通过；公网使用模拟账号、模板与缩略图数据验证实际部署的多栏布局、模板切换和待办筛选，没有操作正式账号或模板。原登录二维码创建、轮询、解码及后端 health/ready 均正常，无浏览器异常或 HTTP 错误响应。
- 正式容器 healthy、重启 0，其他生产容器 ID 与镜像不变。未提交或推送源码。证据：`artifacts/website-20261022-r9/`；公网布局截图：`production/console-workbench-*.png`。

回滚至 r8：

```sh
sh /home/ubuntu/bojian-releases/website-20261022-r9/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261022-r9/compose.override.yaml`。

## 历史版本：2026-10-22 · website-20261022-r8

控制台整体改为作品集画廊：暖白纸感底色、宋体大标题、深绿操作按钮，一行作品统计与开放式网格。移除侧栏及独立统计卡片，桌面三列、平板两列、手机单列。作品封面自动读取对应版本的真实缩略图，封面和“查看预览”均可单击打开完整 PDF；缩略图缺失或加载失败时保留文件占位与 PDF 入口。

- 本地构建 `linux/amd64` 镜像 `bojian-website:website-20261022-r8`，本地容器验收与服务器预检通过后，仅切换官网服务。
- 本地与服务器镜像 ID 一致：`sha256:0c8dfb4492d408af2818d1736ec34bae491eb0c805332d64627c3cbba4806a79`；镜像包 SHA256：`0c965e5157434649652cd6aab811ee8f52c8a5a0d732021f46ef0fa140be1e6b`。
- 生产构建、14 项认证及控制台测试、5 项页面测试通过。新增验证缩略图实际解码显示，以及缩略图 404 时 PDF 入口仍可用；原上传、编辑、审核、退出和 PDF 内联预览流程通过。
- 单模板、多模板、空列表分别覆盖 320、390、768、900、1024、1440、1920px，共 21 组布局检查通过，无横向溢出。桌面作品少于三份时提供新建作品卡片，筛选状态下不重复展示；手机隐藏该附加卡片。
- 本地镜像及公网页面、登录二维码、后端 health/ready 验收通过；公网以模拟登录、模板和缩略图数据验证 1440px/390px 真实部署布局，没有操作正式账号或模板。未发现浏览器异常或 HTTP 错误响应。
- 正式容器 healthy、重启 0，其他生产容器 ID 与镜像不变。未提交或推送源码。证据：`artifacts/website-20261022-r8/`；公网布局截图：`production/console-gallery-*.png`。

回滚至 r7：

```sh
sh /home/ubuntu/bojian-releases/website-20261022-r8/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261022-r8/compose.override.yaml`。

## 历史版本：2026-10-22 · website-20261022-r7

重新设计创作者控制台：深蓝侧栏整合模板导航、制作指南与账号认证；主区采用更清晰的字号与对比度、紧凑统计卡片、带数量的状态筛选和模板库。预览、编辑、审核操作集中显示；手机端使用顶部导航与条目底部操作区。制作指南保留独立文档布局。

- 本地构建 `linux/amd64` 镜像 `bojian-website:website-20261022-r7`，本地容器验收及服务器预检通过后，仅切换官网服务。
- 本地与服务器镜像 ID 一致：`sha256:98b6577e4274cb7590e6756d0009ce6c875f2c243d3c683301baba6953b4da68`；镜像包 SHA256：`4c7e79f939f20c509dfebe74458820200ba96549c1cb7da391f83ac3781032ad`。
- 生产构建、14 项认证及控制台测试、5 项页面测试通过。以模拟资料检查单模板、多模板、空列表三种状态，分别覆盖 320、390、768、900、1024、1440、1920px，共 21 组，均无横向溢出；检查状态筛选、上传、编辑、提交审核及单击打开内联 PDF。
- 本地镜像和公网验收通过，二维码创建、轮询及解码正常；公网以模拟登录和模板数据检查 1440px/390px 新版布局及 PDF 链接，没有操作正式账号或模板。无浏览器异常或 HTTP 错误响应。
- 正式容器 healthy、重启 0，其他生产容器 ID 与镜像不变。未提交或推送源码。本地证据：`artifacts/website-20261022-r7/`，设计检查截图位于其中 `design/`，公网布局截图位于 `production/console-layout-*.png`。

回滚至 r6：

```sh
sh /home/ubuntu/bojian-releases/website-20261022-r7/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261022-r7/compose.override.yaml`。

## 历史版本：2026-10-22 · website-20261022-r6

控制台点击“查看预览”直接在新标签页打开 PDF，移除先获取预览状态、再点击“打开完整 PDF 预览”的两步交互。继续使用 r5 的鉴权与内联 PDF 响应。

- 本地构建 `linux/amd64` 镜像 `bojian-website:website-20261022-r6`，本地容器验收及服务器预检通过后，仅切换官网服务。
- 本地与服务器镜像 ID 一致：`sha256:c43bb8d4a44e8b04b1affcf36d88bba98c8e64557f05791b70e825291f978c53`；镜像包 SHA256：`a7d386f47f9f41493782182319181b86cc4fa9aa17390768eed947a1d1ea4cbd`。
- 生产构建与两项控制台回归测试通过；隔离真实浏览器确认一次点击直接打开 PDF 新标签页，不自动下载，控制台保留在原页面。
- 本地镜像及公网桌面/手机验收通过，登录二维码创建、轮询和解码正常。公网控制台脚本确认已有直接 PDF 链接，第二个预览入口已移除；没有使用正式账号打开模板。
- 正式容器 healthy、重启 0，其他生产容器 ID 与镜像不变。未提交或推送源码。本地证据：`artifacts/website-20261022-r6/`。

回滚至 r5：

```sh
sh /home/ubuntu/bojian-releases/website-20261022-r6/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261022-r6/compose.override.yaml`。

## 历史版本：2026-10-22 · website-20261022-r5

修复控制台“打开完整 PDF 预览”直接下载的问题：新标签页改为访问站内鉴权接口，服务端获取对应版本的预览文件并以 `application/pdf`、`Content-Disposition: inline` 流式返回。

- 本地构建 `linux/amd64` 镜像 `bojian-website:website-20261022-r5`，完成本地容器验收后上传，服务器预检后仅切换官网服务。
- 本地与服务器镜像 ID 一致：`sha256:9ed7de463991d8183796e969db665a74e021a74cc6a5722bd0b9d738b639c25d`；镜像包 SHA256：`9657c6852b03f23a76878697973a9b7ec697aad8c0de53178f32c7e9a8827a2c`。
- 生产构建、14 项认证及控制台测试、5 项页面测试通过。隔离浏览器测试确认：存储返回附件下载响应时，点击仍在新标签页预览 PDF，没有自动下载；覆盖未登录、文件归属、未就绪与存储失败。
- 本地成品容器及公网桌面/手机验收通过，二维码创建、轮询和解码正常，后端 health/ready 与管理入口正常，无浏览器异常或 HTTP 错误响应。公网新 PDF 接口已验证未登录返回 401；正式账号中的 PDF 预览未在本次验收中操作。
- 正式容器 healthy、重启 0；其他生产容器 ID 与镜像不变。未提交或推送源码。
- 本地证据：`artifacts/website-20261022-r5/`；服务器发布目录：`/home/ubuntu/bojian-releases/website-20261022-r5`。

回滚至 r4：

```sh
sh /home/ubuntu/bojian-releases/website-20261022-r5/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261022-r5/compose.override.yaml`。

## 历史版本：2026-10-22 · website-20261022-r4

接入开源 `qr-code-styling` 1.9.2，替换自绘二维码。采用纯圆点、圆角定位框、圆点内芯及蓝色渐变；在预览基础上提高颜色对比度并使用 H 级纠错。服务端通过 JSDOM 生成 SVG，每次完成后释放窗口，继续返回原有 `qrDataUrl`，登录协议与自动刷新流程不变。

- 本地构建 `linux/amd64` 镜像 `bojian-website:website-20261022-r4`，服务器加载、预检并仅替换官网服务。
- 本地与服务器镜像 ID 一致：`sha256:00fd32e1206ce8d1186740aa6a701189ced31dcef7f5e8de45fa740463cc1a61`；镜像包 SHA256：`d861ea31ff4b1c0621fb3957948338db4e52c215de00120d13afcae8a526a3fe`。
- 64 组不同测试内容分别在 DPR 1 和 2、238px 实际码图尺寸下解码，128 次全部与输入一致；覆盖预览中失败的测试内容。生产构建和 14 项认证/控制台测试通过。
- 本地成品容器及公网浏览器验收通过，390px/1440px 真实二维码解码、创建及轮询正常，无浏览器异常或 HTTP 错误响应。
- 正式容器 healthy、重启 0；其他生产容器 ID 与镜像不变。未提交或推送源码。
- 本地证据：`artifacts/website-20261022-r4/`；参数比较与多样本检查：`artifacts/qr-library-tuning/`。

回滚至 r3：

```sh
sh /home/ubuntu/bojian-releases/website-20261022-r4/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261022-r4/compose.override.yaml`。

## 历史版本：2026-10-22 · website-20261022-r3

按用户标注，将内部封闭的小方框拆成独立圆角点，保留三个大定位角。所有功能模块保持原编码位置，使用宽高 0.92 模块、圆角 0.3 模块的分离点绘制，避免连成实心方框。

- 本地构建 `linux/amd64` 镜像 `bojian-website:website-20261022-r3`，服务器加载、预检并仅替换官网服务。
- 本地与服务器镜像 ID 一致：`sha256:f178b3d38da2b5b1944b0930872645b260d8bc05206bcd4e606feb9d458c06ee`；镜像包 SHA256：`b819655bf7ffb7f8c892ec3bf60181ae3cf22218b5be7e745bec89fd3c5baa45`。
- 最终样式的 48 组解码检查通过，解码内容与输入完全一致；生产构建和 14 项认证/控制台测试通过。
- 本地成品容器及公网浏览器验收通过，390px/1440px 真实二维码解码、创建及轮询正常，无浏览器异常或 HTTP 错误响应。
- 正式容器 healthy、重启 0；其他生产容器 ID 与镜像不变。未提交或推送源码。
- 本地证据：`artifacts/website-20261022-r3/`，包含无封闭小框的测试二维码预览 `qr-preview.png`。

回滚至 r2：

```sh
sh /home/ubuntu/bojian-releases/website-20261022-r3/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261022-r3/compose.override.yaml`。

## 历史版本：2026-10-22 · website-20261022-r2

按用户第二张参考图调整二维码：圆点与短圆线、圆角方形定位框及内芯、左上青蓝至右下深蓝渐变，移除中央 Logo，外框采用小圆角白底、细灰边框和轻阴影。无 Logo 遮挡后采用 M 级纠错减少码点密度，完整保留后端扫码内容及四模块留白，时序、对齐及格式模块保留实心绘制。

- 本地构建 `linux/amd64` 镜像 `bojian-website:website-20261022-r2`，服务器仅加载、预检及切换官网。
- 本地与服务器镜像 ID 一致：`sha256:8d95783a2e14b0f61bee66350b7a578fafb3ba535fb46f2f5d863d4b68861a7e`；压缩包 SHA256：`6133cf3117ca68f76a5ac7d31442142bf3e05f4217fe81c3b25655ebb4c80010`。
- 生产构建及 14 项认证/控制台测试通过；24 组不同测试内容分别以 DPR 1 和 2 渲染，48 次解码均与原始内容完全一致。
- 本地成品容器及公网浏览器验收通过；真实二维码创建、轮询，以及 390px/1440px 实际解码正常，无浏览器异常或 HTTP 错误响应。
- 正式容器 healthy、重启 0，其他生产容器 ID 与镜像不变。
- 基于 `6a06e22062daee1dc24c11d9aa436ee2b678fe15` 和工作区改动，未提交或推送源码。本地证据：`artifacts/website-20261022-r2/`；样式及多样本解码检查：`artifacts/qr-style-check/`。

回滚至 r1：

```sh
sh /home/ubuntu/bojian-releases/website-20261022-r2/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261022-r2/compose.override.yaml`。

## 历史版本：2026-10-22 · website-20261022-r1

二维码采用蓝色渐变、圆角定位框及圆点中心，保留四模块留白、高纠错等级和品牌图标；外框增加细描边与轻阴影。包含工作区已有的首页标题更新及登录状态布局稳定修复。

- 本地 Docker 构建 `linux/amd64` 成品镜像，本地容器验收后上传；服务器加载、预检并仅切换官网服务。
- 镜像：`bojian-website:website-20261022-r1`；本地与服务器镜像 ID 一致：`sha256:1da43e4827f038f56ba7271abeb6aedf741709e4adad79f1fb15e152fa9133ec`。
- 镜像包 SHA256：`3aac45e08636c636c4e675e04a95d12deb021f7fe820225603786ef89636997d`。
- 生产构建、14 项认证/控制台测试、5 项页面测试通过。本地容器及公网浏览器检查通过，真实二维码生成与轮询正常，390px 和 1440px 展示的蓝色二维码实际解码成功；浏览器无异常或 HTTP 错误响应。
- 生产容器 healthy、重启 0；其他生产容器 ID 与镜像不变，`kelance.cn` 首页与发布前逐字节一致。
- 基于 `6a06e22062daee1dc24c11d9aa436ee2b678fe15` 与当前工作区改动，未提交或推送源码。
- 本地证据：`artifacts/website-20261022-r1/`；服务器目录：`/home/ubuntu/bojian-releases/website-20261022-r1`。

回滚至本次切换前的 `bojian-website:template-html-20261021-r1`：

```sh
sh /home/ubuntu/bojian-releases/website-20261022-r1/rollback.sh
```

后续整体 Compose 操作应包含 `/home/ubuntu/bojian-releases/website-20261022-r1/compose.override.yaml`。

## 历史版本：2026-10-21 · website-20261021-r5

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
