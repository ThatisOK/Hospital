# 落实重设计

实施状态：已落实到桌面版 1.2.0，结果和实际接口差异见 [实施记录](implementation-evidence.md)。下文保留设计阶段的论证和计划。
本文是后续执行计划。本轮只交付设计和接口草案，尚未按计划修改运行代码。

## 先固定行为和保留范围

基线为当前工作目录内容，不是仅 HEAD。当前 HEAD 是 `89368a98cfcd527b9eb9b12568c8812e16dc0006`，desktop 与 specs 尚未提交，不能用三点 Git diff 代表已完成的桌面版。

已有行为基线：手工合计、价格快照、保存幂等、作废记录、中文帮助、F1 保留草稿、旧资料源只读、预览无目标写入、非空目标拒绝、照片完整性、备份错误可见、恢复前副本。

每个单元完成都要检查 Java 保留目录内容没有变化，并保留既有 appId、用户数据目录、schema v1 和 backup 格式。

## 1. 固定 transport 请求与响应对应关系

替换 shared/types.ts 中的任意 T、payload:any、可同时缺失 value/error 的 Reply。原生文件选择的取消与业务失败分别表示。建立输入解析 schema，边界参数是 unknown，解析后调用固定业务方法。

先迁移 main/preload/renderer 的所有现有调用，再删除旧 call<T> 和失效 importLegacy 命令。可以保留一个底层 IPC channel，但不能让业务页面知道字符串路由表或自己指定返回类型。

完成证据：错误 ID 类型、错误结果类型、非法请求结构编译失败；畸形 IPC 运行时拒绝；既有所有 UI 路径通过。

## 2. 建立 LocalClinic 的写入与恢复所有权

收回公开 db、transaction、setSetting，SQLite schema/映射/事务只在 clinic/internal。迁移插入四张业务表的代码与备份恢复代码一起搬进这里。建立私有 LegacyImportTarget，由组合根注入 MigrationSession，renderer 不可获取。

saveMedicine、savePrescription、voidPrescription、saveSettings 自动产生备份任务和 committed 结果，主进程不再逐分支调用 schedule。把诊所配置和保护状态拆成两个类型。

所有活动库 I/O 迁入单一 worker，通过消息排队。迁移准备 worker 继续拥有独立临时库，不能共享活动 DatabaseSync。先固定消息与生命周期，迁移完毕删除 main 中旧数据库实例，不同时保留两套写入者。

完成证据：公开入口保存/作废/恢复/导入后观察数据和保护状态；真实临时 SQLite 故障下无半份记录；新写入不会忘记备份；恢复已提交但后备份失败仍报告 committed；窗口可处理进度和取消。

## 3. 合并金额规则和编辑会话

抽取当前 store 定价实现，quote/save 复用。明确默认、保留原记录总额、本次手工总额三种结果，历史来源无法推断时不制造标签。

PrescriptionEditor model 自持 FormInput、最新报价 revision、提交标识和保存状态。组件切换不写全局 draft。报价结果只更新相同 revision；保存返回最终价格。

幂等标识与请求内容绑定是重设计中的行为加固，先补同内容重试和改内容重试的用例。若现有 v1 数据无法无歧义建立旧请求映射，应保留旧标识读取兼容并对新标识记录必要审计载荷，不能静默改变旧记录。

完成证据：原有 19 项存储/金额用例仍通过，删除 renderer 的第二套定价分支；非法调整金额取消勾选后可保存；同一标识不同内容不能默默返回旧处方；帮助/离开提示不丢草稿。

## 4. 合并迁移状态与来源读取

将 source/preparation/preview/commit/dispose 管理集中到 MigrationSession。状态显式区分 preparing、canceling、reviewing、committing、completed、failed，来源 choice 显式区分目录、JSON、手工连接。

选定目录和照片目录转换为主进程会话句柄；实际连接信息与文件路径不由 renderer 任意拼装。源码和 class 文件解析只返回 LegacyConnectionInput，jdbc 解析单向依赖，不再形成 migration-source ↔ dao-class 环。

GUI 与备用 CLI 复用同一 MySQL reader/照片校验规则。Worker 事件从 unknown 校验成固定消息，取消/清理/发布预览携带会话代号，旧事件不能写入新状态。

完成证据：取消发生在创建 worker 前后都无目标写入；清理暂时 EBUSY 后可重试；预览文件改变后不能提交；确认前后非空检查；密码不出现在预览和日志；正常关闭后临时目录清理。

## 5. 按 screen 分开 renderer

将 app.ts 的处方、药品、历史、汇总、设置各自移入 screen。迁移 view 直接消费唯一状态，Shell 不再知道迁移内部按钮名称。help 保持内容与 view 可单独维护。

公用代码只保留被多个真实调用者使用的 dialogs、notifications、leave-guard。不要建立所有页面必须继承的 BaseScreen。

完成证据：按 F1 查看帮助后草稿不变；关闭/导航对所有编辑页面一致；每次 dispose 后事件不叠加、摄像头停止；1000×700 无横向溢出；迁移 committing 状态没有取消按钮。

## 6. 完整验收再更新安装包

```powershell
cd desktop
npm test
npm run test:ui
npm run test:migration
npm run package
node tests/packaged.cjs
node tests/migration-ui.cjs --packaged
```

安装包验收使用可见窗口和隔离的 user-data-dir。已有记录显示隐藏窗口自动化可能超时，不能把测试窗口问题认定为业务失败。

额外核对：新构建读取旧 1.1.0 合成 SQLite，恢复旧版备份；旧 Java 保留内容摘要一致；安装包无 Java/MySQL 服务依赖；迁移阶段才加载源数据库驱动。

## 测试如何随结构迁移

保留能证明结果的测试，逐项迁移，不整批删掉旧测试。

- 表单与业务输入解析测试覆盖真实非法输入，不逐行镜像实现。
- 金额测试通过报价/提交的共同 seam，断言明确金额和保留来源。
- 集成测试通过 LocalClinic，使用临时 SQLite 和文件。数据库文件可通过独立只读检查确认持久化，但不公开 db 给普通调用者。
- 取消、时钟和文件失败使用内部受控 Adapter。生产 Adapter 操作真实文件，测试 Adapter 在对应操作上报错；不修改原型和私有字段。
- 旧 MySQL 使用现有 TCP 协议 fixture，至少一条打包流程穿过真实 mysql2 与来源 worker。
- Native Dialog/Windows service 是外部能力，仅这里使用受控替身，不启动机器上的真实服务。
- 新接口测试完全覆盖原断言后，删除内部结构绑定的旧版本。不要叠加两套表达同一行为的测试。

现场迁移、真实打印机/摄像头、Windows 版本、数字签名与断电演练仍是部署验证，不能由代码重设计代替。
