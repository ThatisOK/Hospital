# 应用内迁移与帮助验证 — 2026-09-30

## Outcome
1.1.0 将旧资料迁移和中文使用帮助放入桌面应用。用户无需运行导出命令或安装开发工具。真实旧电脑数据与服务仍未访问。

## Change summary
- 新增“迁移旧资料”：后台读取、进度与取消、预览数量/金额/日期、确认后迁移、迁移前后备份、重复/非空库保护。
- 常见 Tomcat 目录发现，选择旧目录，Java 源码与真实 DAO 字节码参数识别；高级连接与照片文件夹选择作为维护者后备。
- 已识别连接凭据不回传 renderer、不写日志；只读源数据库，MyISAM 等非事务表暂时读锁，读取后释放。
- 检测并经用户确认启动选中的本机旧数据库服务；验证命令行第一项实际可执行文件名，不执行旧目录脚本、不改服务设置、不自动提权。
- “使用帮助”/F1：离线中文步骤，开方、合计、查询、照片、打印、迁移、备份、恢复和常见故障；打开后保持草稿。

## Acceptance evidence
| ID | Evidence | Result |
|---|---|---|
| MH-1 | Java/真实 javac8 同账号密码字节码 fixture、秘密不回传、手动设置校验 | pass |
| MH-2 | 假 connector 单测 + TCP MySQL 协议合成服务通过真实 mysql2/后台 worker 读取及照片导入 | pass synthetic |
| MH-3 | 预览零写入、迁移前备份失败、非空/重复/失效 token、取消早期准备、清理失败后重试 | pass |
| MH-4 | 错误服务可执行文件/参数注入拒绝、启动脚本重新验证及中文权限错误 | pass synthetic; actual service unverified |
| MH-5 | Electron UI 中填写草稿、F1 帮助、返回保持姓名；帮助截图检查 | pass |
| MH-6 | NSIS 1.1.0 包含 mysql2 运行依赖；打包程序完整迁移测试 | pass |

## Validation
- npm test：36 项通过（原数据回归 19 + 迁移 17），TypeScript/Vite 构建通过。
- npm run test:ui：原开方/金额/编辑/作废/汇总/备份/恢复/重启完整流程通过。
- node tests/migration-ui.cjs：真实 Electron + 127.0.0.1 临时合成 MySQL 协议服务，选择目录自动识别 → 预览 → 确认 → 记录/照片 → 重复迁移拒绝；帮助不丢草稿，通过。
- npm run package：Clinic-Setup-1.1.0-x64.exe 生成，通过。旧 1.0.0 包保留。
- node tests/migration-ui.cjs --packaged：最终通过：安装包内的 mysql2/后台线程完成真实协议合成迁移和帮助草稿保留，正常关闭。打包隐藏窗口自动化曾超时，恢复可见窗口后完整测试通过；开发版本已完成视觉检查。
- 无真实 MySQL 连接、服务启动、诊所数据修改或外部发布。

## Review
两轴独立审查已关闭：
1. 配置常量池去重导致密码误识别 → 解析 getConnection 实际 ldc/astore/aload 参数，真实 javac8 fixture 验证。
2. 服务检查误匹配参数中的 mysqld.exe → 两处只检验第一个可执行文件。
3. 准备前取消丢失 → 跨 await 取消标志；清理在 try/finally，EBUSY 后可重试。
4. 关闭时清理未等待 → before-quit 等待；忙时明确提示，不默默忽略关闭。
Spec 与 Standards 最终精确复查均无遗留阻塞项。

## Worktree and external state
延续上一轮未提交修改，无 commit/push/PR。原 Java 源码未修改。新增可复用合成 MySQL fixture 和字节码 fixture（源码+base64），不包含真实凭据。运行时数据/缓存/安装包仍在忽略目录。

## Remaining risk
- 真实旧系统目录、数据库版本/读取权限、照片完整性须在诊所电脑核对。未知配置/密码仍需维护者协助一次，不能承诺零人工迁移。
- 每类数据最多 10 万条、总读取约 256 MB、单张照片 8 MB；超限整批拒绝，不能截断迁移。
- 旧录入必须暂停。非事务表读锁可能需要旧账号额外权限，照片一致性依赖暂停录入。
- 临时副本在正常退出/取消后清理；强制断电或文件持续被占用可能留存系统临时目录，需要维护者清理。
- 安装包未签名；本轮未测试真实服务启动/UAC、硬件设备及目标电脑升级安装。
