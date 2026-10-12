# 单机诊所桌面应用

## Problem
使用者电脑知识较少，旧 Java/Tomcat/MySQL 系统经常因 MySQL 未启动而需要远程处理。当前确认单台电脑使用。

## Outcome
Windows 用户安装后双击打开即可录入、查找处方，无需安装或启动数据库、Java 或 Web 服务；备份和恢复在应用内完成。

## Scope
Electron + TypeScript + SQLite，Windows 10/11 x64。药品目录和价格维护、处方录入/查询/修改/作废、照片附件、月度汇总、医生姓名设置、打印、自动备份、手动导出/恢复；提供维护者使用的旧 MySQL 数据导出工具及应用内导入。
保留 Java 源码，迁移前后可核对。单机使用 Windows 账户访问边界，不迁移旧管理员密码和用户管理页面；旧处方的医生姓名保留。

## Non-goals
联网账号、云同步、多机并发、医保/支付/专用设备接口、库存和药品临床决策、自动发布更新。不会连接或修改真实旧数据库。

## Prototype decision
Not required: 沿用已明确的表单和列表业务，无需先回答新的交互模型问题。用户已授权重构并委托框架选择；Windows 10/11 x64 为当前交付假设，旧系统版本兼容性需部署时确认。

## Behavior and states
- 首次启动为空数据，引导设置诊所/医生及添加药品；不写入演示病历。大字体、清晰导航、中文错误；保存中禁用按钮，失败保留录入内容。
- SQLite 位于用户数据目录，事务保存处方及明细；整数分保存金额，服务端计算药品小计，保留旧系统手工调整合计能力（非负、最多两位小数），详情和打印同时展示小计和合计；历史明细保存药名/规格/价格快照。日期按本地诊所日期记录。
- 连续编号在数据库事务内生成；同一次提交具有请求标识，重试不重复开方。修改保留编号和时间，作废保留原记录并从汇总排除。
- 照片由用户选取或经许可拍照，存入数据库，备份为完整 SQLite 文件；导入文件大小受限。
- 每日启动和业务写入后自动备份（写入后延迟合并），备份失败显示可操作提示，不声称成功。保留最近 30 份自动备份。手动导出可选 U 盘。
- 恢复先做格式、版本、完整性和外键检查，确认后备份当前数据，再在事务内恢复。错误不得清空已有数据。
- 导入仅支持空库和专用 JSON 导出格式，校验所有记录、关联及图片路径；导入在事务中完成。旧系统未保存历史药价，导入明细价格明确标记为迁移时价格，总额保留原值。
- 应用单实例；关闭含未保存表单时提醒；无网络依赖，无远端页面，无直接 renderer 文件/SQL 权限。

## Constraints
当前库无构建清单、SQL schema 或有效自动测试；本轮先建立新应用的独立测试基线。保留旧文件和数据，不提交/推送。NSIS 用户级安装，随包携带运行环境；未签名构建仅用于用户验收，实机上线需迁移核对和恢复演练。

## Acceptance matrix
| ID | Observable criterion | Verification seam | Scenario or command | Status |
|---|---|---|---|---|
| AC-1 | 无 MySQL/Java 环境能打开打包应用且关闭重开数据仍存在 | Electron smoke | npm run test:ui; packaged smoke | pass (see evidence) |
| AC-2 | 药品维护和搜索可用，输入错误有明确提示 | automated + UI | npm test; test:ui | pass (see evidence) |
| AC-3 | 原子保存处方、金额准确、编号唯一、重复请求不重复保存 | automated | npm test | pass (see evidence) |
| AC-4 | 药品调价不修改已保存明细；修改/作废及月度汇总正确 | automated + UI | npm test; test:ui | pass (see evidence) |
| AC-5 | 图片随备份恢复，坏备份拒绝且当前数据不变 | automated | npm test | pass (see evidence) |
| AC-6 | 自动备份、导出、恢复流程可见，恢复需确认且有恢复前副本 | automated + UI | npm test; test:ui | pass (see evidence) |
| AC-7 | 可导入旧系统导出，错误/重复导入不造成半份数据 | automated | npm test with synthetic legacy fixture | pass (see evidence) |
| AC-8 | 安装包可生成，无需用户单独安装运行环境 | build + manual | npm run package | pass (see evidence) |
| AC-9 | 中文界面、键盘操作、空/错误状态、未保存提醒及打印入口 | UI | npm run test:ui; screenshot inspection | pass (see evidence) |

## Open decisions
| Decision | Why it matters | Owner | Status |
|---|---|---|---|
| 实际 Windows 版本和打印机/摄像头 | 最终设备兼容性 | 使用者/维护者 | 部署前核验，不阻塞本地实现 |
| 真实 MySQL schema、存量数据和照片目录 | 迁移完整性 | 维护者 | 合成样本通过，真实迁移未执行 |
