---
name: semi-auto-collab
description: 半自動協作流程：Claude 當工頭，用 codex exec 把已核可計畫中的單一 Task 交派給 Codex 施工，再做機器檢查與分級審查（最多退件 2 輪），推送分支並開 PR；合併 main 必須等使用者說「合併 Task N」。Use only when the user explicitly invokes /semi-auto-collab or says「半自動執行 Task N」/「合併 Task N」, or when a codex exec dispatch prompt names this skill (Codex then reads BUILDER.md).
disable-model-invocation: true
---

# 半自動協作（Claude 工頭 × Codex 施工）

## 先讀哪一篇

- **Claude（工頭）**：讀 [FOREMAN.md](FOREMAN.md)，照步驟執行。
- **Codex（被 `codex exec` 交派的施工方）**：只讀 [BUILDER.md](BUILDER.md)。
- 範本：[templates/](templates/)（HANDOFF Task 區塊、交派指令、報告）。

## 角色

| 角色 | 負責 |
|---|---|
| 使用者 | 核可計畫、啟動 Task、回答阻塞問題、裁決爭議、批准合併 main、親自處理登入與密鑰 |
| Claude | 開工檢查、交派、機器檢查、審查、推送分支、開 PR、經批准後合併與部署、驗收、報告與教學 |
| Codex | 規格挑錯（唯讀）、在指定分支修改檔案、寫狀態與證據；不提交、不推送、不開 PR、不合併、不部署 |

## 流程總覽

```
✋ 使用者：「半自動執行 Task N」
B1 開工檢查 → B2 交派單 → B3 規格挑錯（有 spec 才做）
→ B4 Codex 施工（可分階段 Na → Nb…，同一分支）→ B5 機器檢查 → B6 分級審查 ─退件（≤2 輪）→ B4
C1 分支全測 → 推送分支 → 開 PR → 預覽網址（如有）
D1 報告 → ✋「合併 Task N」 → D3 合併 main → main 全測 → 部署 → 驗收 → 歸檔
```

## 前提（任一不成立就不啟動，回報原因）

- 專案是 Git 倉庫且有 `HANDOFF.md`；Task 屬於使用者已核可的計畫。
- 上一個半自動 Task 已合併 main（不疊分支）。同一 Task 的施工階段共用一個分支，不受此限。
- 一次只跑一個 Task。施工階段依序交派，不算多個 Task；同一時間只有一個階段在執行。

## 硬性規則

1. Codex 只修改檔案、不提交（沙盒把 `.git` 鎖成唯讀，技術上碰不到分支與 main）。審查通過後由 Claude 提交；推送、PR、合併、部署也都由 Claude 做。
2. 合併 main 只在使用者明說「合併 Task N」後進行。
3. Codex 執行期間，Claude 不寫入任何專案檔案；使用者也不要用 Codex 桌面版開同一專案。
4. 退件最多 2 輪；機器檢查沒過的退件也算一輪。輪次以整個 Task 計，不按階段重算。
5. 單次交派上限 40 分鐘；失敗不自動重試。
6. 花費超過門檻就停下回報：單次交派 800 萬、整個 Task 累計 1,200 萬（輸入含快取，見「門檻」）。
7. `HANDOFF.md` 分欄寫入：Claude 寫交派與審查欄，Codex 寫施工欄（輪流寫入，不同時）。
8. 教學只交付一份：Codex 寫重點，Claude 整合成教學檢查點。

## 一律停下找使用者

| 情況 | 處理 |
|---|---|
| 開工檢查異常（未提交修改、計畫不清、上一 Task 未合併） | ✋ 回報並等指示 |
| 規格挑錯發現矛盾或需要產品決策 | ✋ 問使用者 |
| Codex 狀態「阻塞」 | ✋ 轉述問題；登入／授權／密鑰則 🔑 一步一步教 |
| Codex 狀態「失敗」或讀不到狀態 | ✋ 附錯誤紀錄 |
| Codex 不同意退件且 Claude 未被說服；或 2 輪仍不過 | ✋ 整理雙方看法請使用者裁決 |
| 超出範圍、付費、刪資料、破壞性遷移、可能蓋掉未提交修改 | ✋ |
| 花費超過門檻（單次 800 萬／Task 累計 1,200 萬） | ✋ |
| 合併或部署任一步失敗 | ✋ 停下附證據，正式站不更新 |

## 交派一律透過腳本

`node scripts/dispatch.mjs`（用法見檔頭）固定：沙盒（規格檢查唯讀、施工只寫專案）、不詢問核可、推理強度、**網路預設關閉**、40 分鐘逾時、token 記錄到 `~/.claude/semi-auto-logs/<專案名>/usage.jsonl`。不得改用其他旗標直接呼叫 `codex exec`，禁止 `--dangerously-bypass-approvals-and-sandbox`。

## 額度（ChatGPT 訂閱，不另計費）

- 保護的是訂閱額度：花費超過門檻就停下回報；每份報告附 token 用量。
- Codex 回報額度不足或被限流：標「失敗」，告知重置時間，不硬等、不重試。
- 實測：一次什麼都不做的呼叫約 26,000 輸入 token（約一半有快取），這是每次交派的冷啟動成本。

## 門檻

| 門檻 | 基準 | 停下回報 |
|---|---|---|
| 單次交派（一個施工階段或一輪退件） | 400 萬 | 超過 **800 萬** |
| 整個 Task 累計（規格檢查＋所有階段＋退件） | 600 萬 | 超過 **1,200 萬** |

- 數字以腳本摘要 `tokens.input`（輸入含快取）計；可依自己的訂閱方案調整。
- 腳本只在一次交派結束後回報用量，中途無法停止：單次超標時，不再交派下一階段或下一輪，先回報。Task 累計若加上下一次預估（約 400 萬）會超過 1,200 萬，交派前先回報並請使用者決定。
