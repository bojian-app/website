# 2026-10-20 App 扫码登录服务端发布

关联：https://github.com/fahnzjan/bojian-mobile/issues/32 与 https://github.com/fahnzjan/bojian-backend/issues/8 。用户追加授权服务端发布；未提交、未推送，Issue 保留开放。

## 发布内容

- 使用现有后端 QR 实现，未改动手机 App 源码或重装 App。
- 从当前源码创建隔离快照 `/tmp/bojian-app-qr-release-20261020-r1`；源文件哈希清单 `source-sha256.json`。
- Linux/amd64、CGO_DISABLED 静态构建，二进制 SHA256：`af8fa5fc3f054a0e071b461346b1ceb46f50d6596c2b58abfe920478754c3ce5`。
- 以现有 `bojian-api:baidu-native-identity-20261020-r1` 为基础，仅替换 API 二进制。新镜像 `bojian-api:app-qr-login-20261020-r1`，ID 前缀 `e7d996af85ac`。
- 服务端目录 `/home/ubuntu/bojian-releases/app-qr-login-20261020-r1`；保留旧镜像、旧 Compose 覆盖与百度私有配置。
- 发布前数据库自定义格式备份 `database-before.dump`（355293 bytes，已用 pg_restore --list 验证），目录权限仅当前用户可访问；不复制到官网仓库。
- Compose 发布前比较 API 环境变量，变更列表为空。只执行 `up -d --no-deps api`，其他容器保持原实例。
- 启动自动执行新增表迁移 `052_app_qr_login.sql`；已检查版本记录与表存在。

## 验证

- 隔离快照 `go test ./...`、`go vet ./...` 通过。最初快照缺少测试读取的 docs/openapi.json，补齐同一源码文件后重跑通过。
- 独立本机 PostgreSQL 下 `WECHAT_TEST_DATABASE_URL=... go test -race ./internal/httpapi -run TestAppQR -count=1 -v`：六项及其五个失败场景子测试通过，未跳过。测试数据库已停止，不接触正式账号。
- API 容器 healthy，重启数 0；公网 health/ready 均为 200；公开 OpenAPI 包含新扫码接口。
- 公网真实创建 201/WAITING、状态 200/WAITING；协议缺失 422、提前兑换 409、设备/凭据错误 404、匿名确认 401。
- 官网真实生成二维码和查询状态已通过。用户随后报告 App 已确认，生产记录核实一枚二维码于 10:37:07 UTC 兑换为 EXCHANGED，并同时创建独立 WEB 会话。真实扫码登录闭环通过；浏览器重载和真实续期未在该会话继续观察，不能把受控窗口的过期结果写成成功。重载/续期的自动化契约及真实数据库服务端测试通过。

## 回滚

在 `/home/ubuntu/bojian-backend` 使用原有四个 Compose 文件：compose.production.yaml、deploy/compose.admin.yaml、guidance-participants-20261019-r1/compose.override.yaml、baidu-native-identity-20261020-r1/compose.override.yaml，保持 `CADDY_IP=172.18.0.3` 与 `.env.production`，仅 `up -d --no-deps api` 即回到旧 API 镜像。不要包含本次新覆盖文件。新增 052 为附加表，回退 API 时保留表；不自动恢复整库。
