# 桌面应用交付验证 — 2026-09-30

## Outcome

实现了单机 Windows Electron + TypeScript + SQLite 应用及用户级 NSIS 安装包。以本地代码和合成资料验收，尚未在诊所电脑部署、连接真实旧数据库或迁移病历。

## Change summary

- `desktop/src/main/store.ts`：本地 SQLite、原子处方保存、整数分金额、历史明细快照、手工合计、幂等提交、作废保留及审计。
- `desktop/src/main/backups.ts`：完整照片/数据备份、最近 30 份自动备份、校验后恢复、恢复前备份、备份错误内存状态和即时通知。
- `desktop/src/main/main.ts` / `preload.ts`：沙箱 Electron、受限 IPC、单实例、用户目录、原生文件选择和打印。
- `desktop/src/renderer/`：中文大按钮界面、药品/处方/汇总/设置、拍照和选照片、键盘快捷键、未保存提醒。
- `desktop/tools/export-legacy.cjs` / `src/main/legacy.ts`：只读导出工具和空库事务导入，保留原总额和医生姓名，历史药价来源标识。

## Acceptance evidence

| ID | Evidence | Result |
|---|---|---|
| AC-1 | `tests/packaged.cjs` 打包程序独立启动/重启，PATH 仅保留 System32，无外部数据库连接代码；隔离数据目录 | pass |
| AC-2 | 药品输入/搜索/停用回归；真实 Electron 添加药品 | pass |
| AC-3 | 失败注入回滚处方/编号、精确金额、重复请求、连续编号 | pass |
| AC-4 | 调价后历史快照、修改、作废、闰年月末、手工总额及月报 | pass |
| AC-5 | 照片完整恢复、坏备份/错误 schema 拒绝、当前资料保留 | pass |
| AC-6 | 原生文件对话框替身配合真实 IPC 导出/恢复；备份失败注入并在当前页显示；元数据写入失败仍可见 | pass |
| AC-7 | 合成旧资料导入、总额/照片/医生核对、错误关联整批回滚；真实库未接入 | pass synthetic / live unverified |
| AC-8 | NSIS 安装包构建、打包程序独立启动；未在真实目标电脑执行安装/升级/卸载 | build pass / target unverified |
| AC-9 | 界面流程、快捷键、取消离开保留草稿、药品表单提醒、1000×700 无横向溢出；打印入口实现 | UI pass / hardware unverified |

## Validation

- `npm test`：TypeScript/Vite 构建及 19 项 Node 回归通过。
- `npm run test:ui`：真实 Electron 自动化通过：设置、药品、新处方、合计调整、修改、作废、月报、导出/恢复、重启、最小尺寸、备份失败提示、未保存提醒；无 renderer 未捕获异常。最终表单细节回归已通过：无效调整金额取消勾选后不阻止保存。
- `node tests/packaged.cjs`：独立打包程序在仅 System32 的 PATH 下运行，SQLite 自动打开，保存设置重启仍存在；renderer 无 Node require。最终重打包后再次通过。
- `node --check tools/export-legacy.cjs`、工具 `--help` 通过；未调用真实 MySQL。
- `git diff --check` 最终通过。
- 截图：`desktop/test-results/prescription.png`、`backup-settings.png`、`minimum-window.png`，已视觉检查。
- 旧 Java 系统无构建清单/数据库 schema/有效自动测试，不运行它且不改源文件。

## Review

使用 code-review 的 Standards 与 Spec 独立审查。

| Round | Blocking findings | Fixes | Validation rerun | Re-review result |
|---|---|---|---|---|
| 1 | 自有备份 1 GB 上限、延迟/磁盘满错误隐藏、恢复后备份失败误报、迁移来源丢失、其他表单未保存提示 | 移除任意体积上限；内存状态+IPC；恢复结果独立；保留 legacy；所有编辑表单保护 | 18 项回归、完整 UI | 两轴 clear |
| 2 | 旧页面可改总额应保留；隐藏无效金额输入仍阻止提交 | 金额覆盖严格校验、保留修改前金额、同时显示小计/合计；取消勾选禁用输入 | 第 19 项回归及 UI 金额流程 | Standards clear；Spec 精确复查 clear |

## Worktree and external state

基线 HEAD `89368a98cfcd527b9eb9b12568c8812e16dc0006`，开始时干净。修改 README/.gitignore，新增 desktop/ 和 specs/；原 Java 源码未动。没有提交、push、PR、外部消息或生产部署。构建产物/缓存/截图已忽略。

打包验证首次发现 Windows appData 不随 APPDATA 环境变量替换，创建了默认空用户目录（0 药品、0 处方）；核对后移动到被忽略的 `desktop/test-results/initial-packaged-empty-profile`。已改为绝对 `--user-data-dir` 在验证时隔离，默认实际数据仍位于 `%APPDATA%/ClinicAssistant`。

## Remaining risk

- 安装包未签名，当前用于验收；Windows SmartScreen 提示、目标系统和实际安装升级流程尚需验证。
- 真实 MySQL schema、日期/金额/照片完整性需按 migration.md 核对和恢复演练。超过 256 MB JSON 或单照片 8 MB 需要扩展导入工具。
- 摄像头和打印机未接入真实设备。照片/金额测试使用合成资料。
- 无独立登录/数据库加密，以 Windows 账户为单机边界；外部备份由诊所保管。
- 30 份全量备份会占用磁盘；失败会显示提示。本机备份不能抵御硬盘故障。
- 未执行 GB 级数据、长时间运行和断电实验；事务和错误回滚通过可控失败注入验证。
