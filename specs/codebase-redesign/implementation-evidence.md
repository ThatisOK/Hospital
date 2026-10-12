# 重设计实施记录

2026-10-12。实现版本 1.2.0，保持 Electron、SQLite schema v1、用户数据目录和应用安装标识。

## 已完成的结构

- `desktop/src/contracts` 定义 Zod 输入、输出校验和固定方法桥接。旧 `call<T>`、`payload:any` 与 shared 命令表已删除。
- `clinic/index.ts` 提供 `LocalClinic` 和生命周期拥有者 `ClinicHost`。活动数据库只在 `clinic/internal/worker.ts` 打开。迁移、恢复和写入在同一数据拥有者内执行，原生窗口不运行 SQL。
- 所有提交自动调度备份，返回 committed 和保护状态。诊所配置与备份状态分开。变更提交后刷新失败仍显示已保存，清空完成的草稿。
- `MigrationSession` 发布有 sessionId/revision 的状态，prepare/commit 仅返回接受动作。视图通过订阅驱动进度、预览、完成和失败，导入期间没有取消按钮。
- 原 source-reader、配置解析和 worker 移入 migration/internal，jdbc 解析为单向依赖。GUI 与备用 CLI 复用 MySQL 读取实现。
- 开方、药品、历史、汇总、设置、迁移页面分别放在 renderer/screens。开方拥有草稿、报价 revision、相机与提交状态；导航注销迁移订阅、停止摄像头；帮助保持当前页挂载。
- quote 与 save 共用数据库内同一报价规则。保存时重算最终金额。新提交指纹存入现有 audit 表，同标识相同内容幂等，同标识不同内容明确拒绝；旧标识保持兼容。
- restore 的检查生成独立、已校验副本及一次性计划标识。确认后恢复该副本，原选择文件变化不会改变恢复内容。
- 导入或恢复开始时拥有者立即拒绝新的业务变更；重复 close 共用一次关闭 Promise，退出等待迁移清理和活动库关闭。
- build 执行模块依赖检查。renderer 禁止导入存储和 Electron，非 clinic 文件禁止导入 clinic/internal，所有 TypeScript 禁止 any。已注入非法 import 验证检查失败，再移除后通过。

## 与接口草案的取舍

保留现有 DTO 字段名和 ID 表示，避免为目录重构改写整个产品数据模型。固定方法和 schema 已消除调用者选择返回类型的漏洞，但设计草案中的所有品牌 ID 未全面推广。金额来源按 calculated、retained、manual 返回；历史 v1 没有手工金额原因，未凭空推断。

恢复计划标识和迁移来源句柄是主进程拥有的会话值。Windows 服务能力继续使用重新核验后的服务名，执行路径身份校验和原生确认，没有添加额外通用插件层。

`clinic/preparation.ts` 是后台准备模块的内部组合入口，创建其拥有的临时库。它不暴露活动连接。迁移通过 ClinicHost.importTarget 复制已验证快照，renderer 没有该能力。

这些取舍保留设计的模块所有权、失败语义和可验证接口。不存在声称全部接口草案一字不差落地的前提。

## 验证结果

| 检查 | 结果 |
|---|---|
| npm test | 构建和 36 项公开接口/协议回归通过 |
| npm run test:ui | 开方、金额调整、编辑、作废、汇总、导出/恢复、重启、最小窗口通过；包含真实文件故障造成提交后 overview 失败，界面明确显示已保存并清空草稿 |
| npm run test:migration | 合成 MySQL TCP 协议穿过真实驱动和 worker，预览、处方/照片导入、JSON 选择取消、重复拒绝、F1 草稿保留通过 |
| 旧版兼容 | 重构前 1.1.0 实现生成的合成 SQLite/完整备份可打开并恢复，通过。fixture 用 base64 纳入测试 |
| 模块检查 | 正常通过；非法 renderer→clinic/internal import 确实失败 |
| 类型检查 | 编译断言拒绝错误参数、调用者自选结果 T、SQL 访问和旧 call |
| Java 摘要 | 221 个原 Java、资源、配置文件内容一致 |
| npm run package | 1.2.0 Windows NSIS 构建通过 |
| 打包程序 | 独立启动和重启通过；打包完整合成迁移通过 |

测试数量与旧版相同，不代表测试逐条不变。删掉原型替换、读取私有字段的旧测试后，改为公开入口及真实文件/SQLite 故障验证，补充恢复选择文件被替换、最终准备时取消、并发关闭和替换期间写入拒绝。

旧版完整 snapshot 使用隔离基线发出的 store/import 数据实现生成，整套旧项目在独立临时目录缺少 Electron/MySQL 模块引用导致全项目类型检查失败。该失败没有被作为重构通过证据；fixture 使用实际发出的旧 store/import 代码生成，新兼容测试独立通过。

构建保留 Node SQLite 实验警告和 Zod 包注释的 Rollup 提示，未影响通过结果。没有关闭安全检查或修改第三方代码消除提示。

## 审查与修复

Spec 与 Standards 两轴独立审查，最终无遗留阻塞项。

- 检查备份与确认之间可变文件的问题改为已验证副本的计划句柄，A→B 文件替换回归通过。
- JSON picker 取消后明确恢复控件，真实桌面取消测试通过。
- 提交成功与页面刷新分别处理，后续 refresh 失败不重试保存。
- snapshot hash 完成后再次检查取消，最终校验阶段取消回归通过。
- 数据拥有者独占替换时拒绝新写入，公开并发测试通过。
- 多次 close 使用一次关闭过程，三次并发关闭均完成，关闭开始后拒绝新请求。

## 保留及交付范围

原 Java `src/`、`WebContent/`、Eclipse 元数据和流水号文件均保留原位置。当前分支为 master。用户明确调用 implement，其技能要求提交当前分支；本次完成审查后提交 scoped 源码、测试和文档，不推送。

开始时 desktop 和 specs 是此前会话已完成但尚未提交的内容；因此提交会包含整个已授权桌面系统与此次结构重构。已检查无预先暂存的其他工作，不包含 build 缓存、安装包、真实病历、临时迁移副本。

尚未在诊所真实电脑部署，未连接真实 MySQL、启动旧服务、迁移真实病历或测试实际打印机/摄像头。安装包未签名。真实切换仍按 migration.md 核对，Java 的删除需要以后单独决定。
