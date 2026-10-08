# semi-auto-collab：Claude 工頭 × Codex 施工

一個給 [Claude Code](https://claude.com/claude-code) 與 [OpenAI Codex CLI](https://github.com/openai/codex) 共用的技能（skill）。

Claude 當「工頭」：把已核可計畫中的單一 Task 用 `codex exec` 交派給 Codex 施工，再做機器檢查與分級審查（最多退件 2 輪），最後推送分支並開 PR。合併 `main` 一定要等使用者明說「合併 Task N」。

## 檔案

| 檔案 | 用途 |
|---|---|
| `SKILL.md` | 技能入口：觸發條件、整體流程、額度門檻 |
| `FOREMAN.md` | Claude（工頭）的逐步檢查表 |
| `BUILDER.md` | Codex（施工方）的施工規則 |
| `scripts/dispatch.mjs` | 包裝 `codex exec`，固定沙盒、網路關閉、逾時與 token 紀錄 |
| `scripts/watch-codex.ps1` | 即時觀看 Codex 正在做什麼（Windows PowerShell）。不給專案名時自動挑所有專案中最近一次交派 |
| `templates/` | `HANDOFF.md` Task 區塊、交派指令、報告範本 |
| `agents/openai.yaml` | Codex 端的顯示名稱與「不自動觸發」設定 |

## 安裝

把整個資料夾複製到兩邊的技能目錄：

```bash
git clone https://github.com/nccu1133060/semi-auto-collab ~/.claude/skills/semi-auto-collab
cp -r ~/.claude/skills/semi-auto-collab ~/.codex/skills/semi-auto-collab
```

需要：Node.js 18+、已登入的 Codex CLI、`git`、GitHub CLI（`gh`，用來開 PR）。

## 使用

技能設定為只能手動觸發。在 Claude Code 裡輸入：

- `/semi-auto-collab` 或「半自動執行 Task 1」：開始交派一個 Task
- 「合併 Task 1」：審查通過後授權合併

前提：專案是 git 倉庫，並且有一份 `HANDOFF.md`，裡面寫著 Task 的負責人、檔案範圍與驗收標準。

## 可選的外部規範

流程中提到的 `testing-policy.md`、`frontend-codex.md`、`product-security-qa.md` 是作者自己的品質規範檔，不包含在本倉庫。你可以換成自己的規範；沒有的話，檢查表對應項目寫「不適用：原因」即可。

## 授權

[MIT](LICENSE)：可自由使用、修改與再發布，保留版權聲明即可。
