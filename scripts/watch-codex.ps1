# 即時觀看最新一次 Codex 交派在做什麼。
# 用法：powershell -File watch-codex.ps1 [專案名]
#   不給專案名：在所有專案中挑最近一次交派；給專案名：只看該專案。
param(
  [string]$Project,
  [string]$LogRoot = (Join-Path $HOME ".claude\semi-auto-logs")
)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$dir = if ($Project) { Join-Path $LogRoot $Project } else { $LogRoot }
$file = Get-ChildItem $dir -Filter *.events.jsonl -Recurse -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $file) { "找不到交派紀錄：$dir（先執行一次交派，或確認專案名）"; exit 1 }
"觀看：$($file.Directory.Name) / $($file.Name)（Ctrl+C 結束）`n"
Get-Content $file.FullName -Wait -Encoding UTF8 | ForEach-Object {
  try { $e = $_ | ConvertFrom-Json } catch { return }
  $i = $e.item
  if (-not $i -or $e.type -ne 'item.completed') { return }
  $t = Get-Date -Format 'HH:mm:ss'
  switch ($i.type) {
    'command_execution' { $c = $i.command -replace '^.*?-Command\s+', ''; "$t  ▶ 執行  $($c.Substring(0, [Math]::Min(110, $c.Length)))" }
    'agent_message'     { "$t  💬 Codex：$($i.text)" }
    'reasoning'         { $r = ($i.text -replace '\s+', ' '); "$t  💭 思考：$($r.Substring(0, [Math]::Min(110, $r.Length)))" }
    'file_change'       { "$t  ✏️ 改檔：$(($i.changes | ForEach-Object { $_.path }) -join ', ')" }
    default             { "$t  · $($i.type)" }
  }
}
