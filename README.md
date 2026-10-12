# 诊所助手

适合单台电脑使用的离线桌面处方管理软件。新版位于 `desktop/`，采用 Electron、TypeScript 和 SQLite，不依赖 MySQL、Tomcat、Java 或网络服务。

## 安装与日常使用

Windows 10/11 64 位：运行 `desktop/release/Clinic-Setup-1.2.0-x64.exe`，随后双击桌面“诊所助手”。安装包包含运行环境。当前构建未签名，交付前需由维护者在目标电脑验收。

1. 首次打开后进入“备份与设置”，填写诊所名称和常用医生姓名。
2. 已有旧资料时，先点击“迁移旧资料”，按照程序提示查找旧系统、核对数量、确认迁移。无需运行导出命令。没有旧资料时再到“药品管理”添加药品。
3. 点击“开新处方”，填写患者、诊断、过敏史，搜索药品并填写数量，点击“保存处方”。看到保存成功提示后再接待下一位患者。
4. 在“处方记录”中查询、修改、打印或作废；月度汇总统计未作废处方金额。
5. 定期在“备份与设置”点击“导出备份到 U 盘 / 文件夹”。备份包含所有药品、处方和照片。

程序左侧的“使用帮助”提供离线分步说明，`F1` 随时打开且保留当前草稿。

快捷键：`F2` 开新处方，`F3` 查处方，`Ctrl+S` 保存。重复打开只会回到已打开的窗口。

## 数据与恢复

数据存放在 `%APPDATA%/ClinicAssistant/clinic.sqlite`，与程序安装目录分开。可从设置页面打开数据文件夹。应用自动备份，保留最近 30 份；失败时显示提示。卸载和更新程序不主动删除数据。

恢复：选择“从备份恢复”，核对文件日期后确认。恢复前自动保存当前数据；坏文件会被拒绝。不要在应用运行时直接复制或替换 SQLite 文件，请使用应用的导出功能。

本机备份不能防止硬盘故障，请保留外部备份。当前使用 Windows 账户权限保护资料，没有独立登录、云端上传或数据库加密；离开电脑时应锁屏，备份介质由诊所保管。

## 开发与验证

开发者需要 Node.js 24+；终端用户不需要。

```powershell
cd desktop
npm ci
npm start
```

```powershell
npm test
npm run test:ui
npm run test:migration
npm run package
```

`npm test` 构建并运行数据库/恢复/迁移回归测试；`test:ui` 使用独立临时数据启动真实 Electron 窗口进行界面验收，截图在 `desktop/test-results/`。`package` 生成用户级 NSIS 安装包。

若安装器缓存被占用，可在当前终端设置独立的 `ELECTRON_BUILDER_CACHE` 目录后重试。

## 范围与迁移限制

- 原 Java 代码保留在 `src/`、`WebContent/`，不参与新版构建。
- 新版按药品快照和数量计算金额，也可勾选“调整合计”手工填写处方总额。详情和打印区分药品小计与合计；不提供收款流程和库存管理。
- 旧系统没有保存历史单价，迁移时保留原处方总额并标记明细为迁移时价格，不能据此还原历史利润。
- 单机直接使用 Windows 账户，旧管理员密码不导入；历史医生姓名保留。
- 摄像头、打印机、真实 MySQL 数据和目标电脑系统兼容性需要现场验证。详细证据见 [桌面版验证](specs/desktop-clinic-evidence.md) 和 [迁移帮助验证](specs/migration-help-evidence.md)。

迁移向导会尝试识别常见 Tomcat 安装目录及旧 DAO 连接配置。无法识别、密码不对或权限不足时仍需维护者协助一次。只有迁移读取时需要旧 MySQL；不会自动安装服务、修改启动类型或删除旧数据。

## 代码结构

- `desktop/src/contracts` 定义输入校验和固定请求结果。
- `desktop/src/clinic` 的 `LocalClinic` 入口管理处方、药品、金额、备份和恢复。活动 SQLite 只在一个 worker 内打开。
- `desktop/src/migration` 的 `MigrationSession` 管理旧资料读取、预览、取消与确认导入。目标库写入通过 clinic 的导入能力执行。
- `desktop/src/electron` 处理窗口、可信 IPC、原生文件选择、打印和旧服务检查。
- `desktop/src/renderer/screens` 按开方、历史、药品、汇总、设置和迁移分开页面。

构建先检查依赖方向。页面不能导入数据库或 Electron 模块；迁移不能直接访问 clinic 内部 SQL。恢复确认绑定已验证的备份副本，迁移和恢复期间的数据替换拒绝新的业务写入。

Java 的原目录和文件继续保留。新旧程序没有双向同步，正式切换后的新增资料需要单独核对，不能直接退回旧库。重构验收见 [实施记录](specs/codebase-redesign/implementation-evidence.md)。
