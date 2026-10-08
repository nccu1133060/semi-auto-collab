# 交派指令範本

沙盒、推理強度、網路、工作目錄、時間上限由 `scripts/dispatch.mjs` 決定。以下文字存成暫存檔，以 `--prompt-file` 傳入。

## 規格檢查（唯讀沙盒）

```
你是半自動協作的施工方。讀 ~/.codex/skills/semi-auto-collab/BUILDER.md 的「規格檢查模式」。
本次是規格檢查，不修改任何檔案。
讀 HANDOFF.md 的 Task <N> 區塊及其「必讀檔案」，依格式回覆。
```

## 施工

```
你是半自動協作的施工方。先讀 ~/.codex/skills/semi-auto-collab/BUILDER.md，並以它為準。
在分支 task-<N>-<名稱> 實作 HANDOFF.md 的 Task <N>。
只改檔案範圍內的檔案；不執行 git add／commit，不推送、不開 PR、不合併、不部署。
遇到產品決策或需要使用者操作時，標「阻塞」後結束。
結束前填寫 Task <N> 的「Codex 填寫」欄，第一行為狀態行。
```

## 施工（階段）

```
你是半自動協作的施工方。先讀 ~/.codex/skills/semi-auto-collab/BUILDER.md，並以它為準。
在分支 task-<N>-<名稱> 實作 HANDOFF.md 的 Task <N> 的階段 <N><字母>，只做該階段列出的行為。
只改檔案範圍內的檔案；不執行 git add／commit，不推送、不開 PR、不合併、不部署。
遇到產品決策或需要使用者操作時，標「阻塞」後結束。
結束前更新 Task <N> 的狀態行與「已完成階段」。
```

## 退件修正（第 <輪次> 輪）

```
你是半自動協作的施工方。先讀 ~/.codex/skills/semi-auto-collab/BUILDER.md 的「退件修正」。
HANDOFF.md 的 Task <N>「審查結果」列出了缺陷與規則卡。只讀相關檔案與規則段落，逐條修正或寫「不同意」與理由。
不執行 git add／commit；結束前更新狀態行與退件回覆。
```
