# 自动记忆 Spike v1

## 语料与方法

固定回放集版本：`v1`。包含 20 个正向场景、10 个负向场景，覆盖语义改写、精确人名/地点、日期时间数字、相关但不同、事实更新、多干扰项、跨对话与纯负例。CI 使用确定性 Stub；真实 Provider 通过浏览器临时 BYOK 请求触发，凭证不进入服务端持久化。

四种模式在同一 Chunk 集合上运行：`vector-only`、`bm25-only`、教程固定权重 `0.7 × vector + 0.3 × bm25`、RRF（`k=60`）。候选按分数降序、Chunk id 升序稳定排序，默认 Top-K=5。

## 逐例证据

| 查询 | 类型 | 期望 Chunk | vector | BM25 | hybrid | RRF | 失败分类 |
|---|---|---|---|---|---|---|---|
| 正向场景 01–20 | 正向 | 对应语料 Chunk | 由 Stub 运行时写入 | 由 Stub 运行时写入 | 由 Stub 运行时写入 | 由 Stub 运行时写入 | 无/Provider 错误 |
| 负向场景 01–10 | 负向 | 无 | 记录候选 | 记录候选 | 记录候选 | 记录候选 | 误注入/无候选 |

## 指标

真实 Provider 未配置时不伪造质量结论。评估 runner 应填充每个查询的实际排名、Recall@1/3/5、MRR、负向误注入率、请求次数、token/费用（Provider 提供时）、处理与检索延迟。

建议门槛：hybrid Recall@5 ≥85%、Recall@3 ≥75%、负向误注入率 ≤10%，且 Recall@5 不低于两个单路基线的较优者。

## 当前结论与下一步

工程链路已可复现：10-message Chunk、摘要、embedding、profile 隔离、四种排序算法、跨对话不可信 system 参考上下文、失败降级与 trace 均有 seam。未配置真实 Provider 前，不能判断摘要事实保留或混合检索是否达标；因此不改变既定 RRF 方向，也不宣称值得进入图谱/遗忘建设。下一步运行真实 BYOK replay，按逐例证据定位限制来自摘要、embedding、BM25、融合、阈值、Chunk 边界或 Prompt 注入。
