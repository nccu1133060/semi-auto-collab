# 即時觀看最新一次 Codex 交派在做什麼。用法：powershell -File watch-codex.ps1 [專案名，預設為目前資料夾名]
param([string]$Project = (Split-Path -Leaf (Get-Location)))
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$dir = Join-Path $HOME ".claude\semi-auto-logs\$Project"
$file = Get-ChildItem $dir -Filter *.events.jsonl | Sort-Object LastWriteTime -Descending | Select-Object -First 1
"觀看：$($file.Name)（Ctrl+C 結束）`n"
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
