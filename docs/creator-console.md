# 简历模板控制台

入口在账号菜单的“退出登录”上方，页面为 `/console`。未登录时先扫码登录，成功后返回控制台；普通登录仍返回首页。`next` 只接受固定的 `/console`，其他值均返回首页。

控制台接入现有博简后端，没有客户端假模板或浏览器本地存储列表。只展示 `/api/v1/me/templates` 中 `source=PUBLISHED_BY_ME` 的记录，购买的模板不算自己的作品。

控制台采用浅灰底、白色圆角面板和蓝色强调的多栏工作台。左侧窄图标导航提供模板、指南及返回首页入口，上传按钮位于作品概览；内容左栏显示作品概览、上架占比和发布步骤，中栏直接显示模板管理列表，右栏显示认证状态和工作提醒。提醒中的数量来自真实模板状态，点击可筛选列表；列表显示状态、定价、发布日期和使用人数，操作区提供“查看预览”。平板重排右栏，手机使用横向图标导航并纵向排列面板，适配 320px 起的屏幕。

`/console` 与制作指南共用覆盖整个视口的应用外壳：顶部导航、账号和下载入口采用独立的紧凑页头，左侧图标栏贯穿页面，内容区独立滚动，法律链接和版权位于应用内底栏。桌面页头高 64px、侧栏宽 64px；手机页头高 56px，侧栏转为横向导航。首页和登录页继续使用公共网站页头与页脚。

移除独立的大幅预览面板、列表上方标题及同步提示、列表底部说明和右侧制作指南卡片；在列表点击“查看预览”直接在新标签页打开对应版本的完整 PDF。发布日期按 Asia/Shanghai 显示；未发布的草稿、审核中和被驳回模板显示“未发布”。使用人数取后端 `usage_count`：按有效简历的有效所有者去重，多份简历属于同一用户时只计一人。统计读取失败显示“—”，不伪装为 0 人。

## 发布流程

1. 上传 DOCX（不超过 8 MiB，与 PDF 导出和预览任务的实际限制一致），填写名称、介绍和免费/积分定价。
2. 申请 `TEMPLATE_SOURCE` 上传凭证，浏览器直接向签名指定的对象存储地址发送文件。这里不发送博简的登录 Cookie 或 Authorization。
3. 对象存储上传成功后，调用完成上传接口，再创建草稿。后端完成 DOCX 转换才算保存成功。源文件不支持 PDF、HTML 或旧版 DOC。
4. 用户点击“提交审核”，先执行模板检查，再提交。实名认证未完成时，可保存和编辑草稿，但不能提交。
5. `SUBMITTED` 表示审核中，审核通过后才是 `PUBLISHED`。被驳回的模板显示审核意见，可修改资料或替换源文件，再重新提交。
6. 已上架模板提供“申请下架”。确认后调用现有后端下架接口，成功进入 `UNPUBLISH_REQUESTED`（下架审核中），不在网页直接标记为已下架。平台完成下架后列表显示 `UNPUBLISHED`（已下架）。两种状态均可筛选，不显示重复申请按钮。下架申请不要求再次实名认证；归属及状态继续由后端检查，失败时展示后端错误并可刷新确认。

## 服务端接入

完整制作规则位于 `/console/template-guide`，顶部及侧栏导航、左侧发布步骤卡片与上传窗口均有入口。规则页无需登录即可阅读，服务端渲染，包含全部基础字段、经历集合与条目字段、循环和条件示例、照片替代文字设置与等比适配规则，以及文件、字体和排版限制。上传窗口通过新标签页打开规则，保留正在填写的资料。

沿用 `BOJIAN_APP_AUTH_ORIGIN` 与 `BOJIAN_WEBSITE_ORIGIN` 配置。接口位于 `/web-api/auth/creator/*`，保留现有 HttpOnly Cookie 的 `/web-api/auth` 路径范围，不把会话凭据交给客户端。

接入层仅允许以下操作，没有任意路径代理：

| 网站接口                    | 后端接口                                                         |
| --------------------------- | ---------------------------------------------------------------- |
| GET `workspace`             | GET `/api/v1/me/templates`、`/api/v1/me/identity-verification` 及自有模板的 `/api/v1/templates/:id` |
| POST `uploads`              | POST `/api/v1/files/uploads`（用途固定为 `TEMPLATE_SOURCE`）     |
| POST `uploads/:id/complete` | POST `/api/v1/files/uploads/:id/complete`                        |
| POST `templates`            | POST `/api/v1/creator/templates`                                 |
| PATCH `templates/:id`       | PATCH `/api/v1/creator/templates/:id`                            |
| POST `templates/:id/unpublish` | POST `/api/v1/creator/templates/:id/unpublish`（申请下架） |
| POST `templates/:id/submit` | POST `checks` 后 POST `submit` 或 `resubmit`                     |
| GET `templates/:id/preview?version=:version` | GET `/api/v1/templates/:id/preview-assets` |
| GET `templates/:id/preview/pdf?version=:version` | 鉴权获取预览地址后流式返回 PDF |

模板列表接口不含统计字段，接入层仅对自有模板 ID 调用现有鉴权详情接口，以最多 4 个并发读取 `published_at` 和 `usage_count`，只返回所需字段；详情失败不阻断模板管理，401 仍按会话失效处理。

点击“查看预览”直接在新标签页打开 PDF，无需再点击第二个入口。站内 PDF 接口鉴权后获取对应版本的预览文件，以 `application/pdf` 和 `Content-Disposition: inline` 返回，避免对象存储的附件响应触发直接下载。文件响应禁止缓存，获取文件时不向存储发送登录 Cookie 或 Authorization。

写入接口检查同源请求、限制 JSON 为 32 KiB，并校验名称、文件大小和积分。后端继续负责文件归属、模板归属、实名认证、检查结果及状态转换。实名认证接口仅投影一个 `verified` 布尔值，不向网页返回证件号码或认证详情；创建接口不转发模板 HTML。

上传服务须为 HTTPS（仅本地开发允许 localhost HTTP），对象存储上传端点需要允许官网来源的跨域 POST。部署环境应允许最长 120 秒的路由处理时间，以适配文件转换；后端默认转换超时为 45 秒。连接中断后不自动重试发布写入，用户应先刷新列表确认是否已保存。

## 验证

`pnpm build` 后运行 `pnpm test:auth`。隔离后端和对象存储测试覆盖鉴权、同源限制、上传用途、模板所有权、仅展示自己的作品、会话轮换后的业务错误、模板检查失败、待审核状态、上传失败不创建模板，以及真实浏览器中的草稿上传、驳回修改、再次提交、退出清空和登录返回路径，以及下架申请的同源/归属/状态限制、取消确认、冲突失败、成功反馈和下架状态筛选。截图位于 `artifacts/console-*.png`，仅包含测试资料。

这些测试不向线上账号提交模板，也不执行真实上架审核。
