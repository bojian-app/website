# 博简官网 · Bojian

Next.js App Router、React、TypeScript 与 GSAP 构建的单屏官网。

## 本地运行

需要 Node.js 20.9+、pnpm 11。

```sh
pnpm install
pnpm dev
```

访问 http://127.0.0.1:3005 。生产构建与运行：

```sh
pnpm build
pnpm start
```

## 页面

- `/`：纯排版单屏首页，以大字号中文“博简”和简短文案形成视觉中心；细分隔线、淡蓝底部渐变与留白构成层次。页头左侧为品牌，右侧为下载和登录/账号，无背景照片。
- `/login`：桌面和手机均使用居中扫码卡片，背景采用淡蓝渐变和细分隔线。二维码空态提示先勾选协议；同意后自动生成，过期自动刷新。默认登录后回首页，从控制台进入登录时回到控制台。
- `/console`：账号菜单中“退出登录”上方的控制台。支持 DOCX 上传、草稿编辑、免费/积分定价、提交审核和驳回后重新提交，仅展示自己创建的模板。上架审核前须在 App 完成实名认证，未认证仍可保存草稿。接入说明见 [docs/creator-console.md](docs/creator-console.md)。
- `/console/template-guide`：完整模板制作规则，包括基础字段、经历循环、条件显示、照片设置和排版限制。控制台和上传窗口均可打开；DOCX 大小统一限制为 8 MB，与预览和导出的实际能力一致。
- `/app-login`：系统浏览器误开扫码链接时的提示，不执行授权。
- `/privacy`、`/terms`：保留登录协议所需法律正文。
- `/opengraph-image`、`/sitemap.xml`、`/robots.txt`：分享图与搜索元数据。

App 尚未上架，点击下载入口会展开开放状态说明，暂不提供下载链接。下载在左、登录/账号在右；菜单支持键盘操作、Esc 及外部点击关闭。上线后替换为实际下载地址。

正文服务端渲染；登录、账号菜单和动效为客户端组件。认证通过同源 `/web-api/auth/*` 接入层和 HttpOnly Cookie 完成，凭据不进入客户端 JSON 或 localStorage。接口协议见 [docs/app-qr-login.md](docs/app-qr-login.md)。

## 验证

```sh
pnpm build
pnpm test:motion
pnpm test:auth
```

5 项视觉/交互测试覆盖旧背景不再请求、品牌排版完整、纯白底色、仅中文品牌、不同尺寸单屏布局、减少动态偏好、页面往返和无 JavaScript 链接。13 项认证与控制台测试使用隔离上游，验证自动换码、App 确认、持久会话、退出、模板上传及手机布局，实际解码展示的二维码。动效实现见 [docs/motion.md](docs/motion.md)。

App 图标来自现有授权品牌资产，详情见 `docs/assets.md`。旧产品预览与粒子源码留存，当前首页不挂载，不进入首页客户端包。旧建筑背景已从页面移除，历史来源记录见 `docs/assets.md`。没有新增外部字体、模型、分析脚本或生成图片。

源码仓库：https://github.com/fahnzjan/bojian-website 。官网尚未部署，历史验收记录见 `docs/review.md`。任务关联：https://github.com/fahnzjan/bojian-backend/issues/8 。
