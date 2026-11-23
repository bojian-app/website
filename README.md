# 博简官网 · Bojian

Next.js App Router、React 与 TypeScript 构建的博简官网。

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

- `/`：产品首页，包含实机界面图库、分组功能导览、求职社区和常见问题。
- `/resume-review/[token]`：仅通过 APP 生成的外部链接进入，自动分配游客，支持简历评论与改写建议，由本人在 APP 确认采用。链接长期有效直到本人停用；独立页面不显示官网导航，不进入 sitemap，并禁止索引。
- `/privacy`、`/terms`：法律正文。
- `/opengraph-image`、`/sitemap.xml`、`/robots.txt`：分享图与搜索元数据。

点击顶部下载按钮显示“官网暂未开放下载”提示。提示可用 Esc 关闭，默认展示 3 秒，再次点击会重新计时。

首页正文和默认产品截图服务端渲染，访客可以切换截图、浏览功能分组并展开常见问题。

## 验证

```sh
pnpm build
pnpm test:motion
```

页面回归测试覆盖实机截图库的图片加载与场景切换、功能分组的键盘操作、问答展开、多尺寸布局、下载提示、减少动态偏好和无 JavaScript 浏览。动效实现见 [docs/motion.md](docs/motion.md)。

## Docker 发布

Dockerfile 固定 Node 基础镜像摘要和 pnpm 版本，使用锁文件安装依赖，输出非 root 运行的 Next.js standalone 镜像。`.dockerignore` 排除本地环境文件和构建产物。

在本机启动 Docker 并构建 Linux/amd64 成品镜像，再上传生产服务器加载和切换；服务器不执行构建。Apple Silicon 的 Colima 建议启用 Rosetta：

```sh
colima start --cpus 4 --memory 4 --vz-rosetta
bash deploy/build-image.sh website-YYYYMMDD-r1
```

发布前应运行上述回归测试，并通过本地容器验证镜像。`deploy/smoke.mjs` 支持 `BOJIAN_SMOKE_ORIGIN` 和 `BOJIAN_SMOKE_ARTIFACTS` 指定测试地址与截图目录；默认测试正式站点。

```sh
bash deploy/deploy-image.sh website-YYYYMMDD-r1
node deploy/smoke.mjs
```

发布脚本默认通过 SSH 连接 `106.52.31.209`，核验 Caddy 的域名为 `bojian.kelance.cn`，校验上传包 SHA256 和镜像 ID，继承当前官网的 Compose 文件集合并追加新官网配置。预检健康后仅替换 `website` 服务；切换失败自动执行回滚，回滚脚本保存在服务器本次发布目录中。每次使用新的发布名，避免覆盖历史发布。后续整体 Compose 操作须包含最新发布的覆盖文件。

App 图标来自移动项目的品牌素材。产品界面图保留手机竖屏比例，页面动效尊重系统的减少动态效果偏好。素材与历史版本的来源见 `docs/assets.md`。

源码仓库：https://github.com/fahnzjan/bojian-website 。官网已于 2026-10-21 部署至 https://bojian.kelance.cn ，发布及回滚记录见 [docs/website-release.md](docs/website-release.md)，历史验收记录见 `docs/review.md`。任务关联：https://github.com/fahnzjan/bojian-backend/issues/8 。

## 外部简历链接发布（2026-11-02）

`website-resume-links-20261102-r1` 已发布并通过容器及生产 smoke 检查。3 项外部链接流程检查和 19 项原有官网回归检查通过；验证资料保留在 `artifacts/resume-link-validation`，配套 App `1.0.0+2026110216` 已安装，待人工测试。游客使用链接范围内的 HttpOnly Cookie；同源接入层限制可访问操作，不提供游客采纳接口。

## 简历分享隐私展示调整（2026-11-03，已发布）

分享页的隐私占位改为直接显示 `***`，移除模糊蒙版；项目名称正常显示并支持批注。配套分享接口不再剔除项目名称，姓名、联系方式、学校、公司、发证机构及项目链接仍按原隐私范围处理。

官网生产构建和 3 项外部分享流程测试通过，覆盖桌面、手机、改写重试及权限校验。官网 `website-share-stars-20261103-r1` 与接口 `share-stars-20261103-r1` 已发布。成品镜像和线上桌面/手机分享页显示检查通过（虚构数据），生产 smoke 检查通过，容器健康。历史快照已被删除的项目名称不会自动恢复；需在 APP 停用旧外链并重新生成。APP 内好友及动态分享同样需要重新分享才能带上项目名称。

## 分享经历排版（2026-11-03，已发布）

官网 `website-share-dates-20261103-r1` 已发布：工作岗位、项目岗位与起止日期同排；教育经历的专业/学历与日期同排，时间段统一使用 `~`。日期仍保留独立字段及批注能力，只有一个日期时不额外显示分隔符，明确在职且无结束日期时显示“至今”。

生产构建、3 项原有分享流程检查、本地成品镜像排版检查通过。用户提供的真实链接在 1280、390、320 像素宽度下共 15 项同排布局检查通过，无横向溢出，打开日期评论时字段值正确且未提交真实评论。官网容器 healthy，首页与 API health/ready 均返回 200。仅更新官网，APP、接口和数据库未修改。证据见 `artifacts/website-share-dates-20261103-r1/`。
