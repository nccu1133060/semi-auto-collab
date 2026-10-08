#!/usr/bin/env node
// 半自動協作：包裝 codex exec，固定安全參數、計時、記錄 token。
// 用法：
//   node dispatch.mjs --mode spec|build|fix --dir <專案> --task <N> --prompt-file <檔案>
//                     [--effort medium|high] [--network off|on] [--timeout-min 40]
// 結果：stdout 印出一行 JSON 摘要；完整事件與最後回覆存在 ~/.claude/semi-auto-logs/<專案名>/。

import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--")) throw new Error(`無法辨識的參數：${argv[i]}`);
    out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const mode = args.mode;
if (!["spec", "build", "fix"].includes(mode)) throw new Error("--mode 必須是 spec、build 或 fix");
if (!args.dir || !args["prompt-file"] || !args.task) throw new Error("缺少 --dir、--task 或 --prompt-file");

const dir = path.resolve(args.dir);
const effort = mode === "spec" ? "high" : (args.effort ?? "medium");
if (!["medium", "high"].includes(effort)) throw new Error("--effort 必須是 medium 或 high");
const network = mode === "spec" ? "off" : (args.network ?? "off");
if (!["off", "on"].includes(network)) throw new Error("--network 必須是 off 或 on");
const timeoutMin = Number(args["timeout-min"] ?? 40);
const prompt = fs.readFileSync(args["prompt-file"], "utf8");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const logDir = path.join(os.homedir(), ".claude", "semi-auto-logs", path.basename(dir));
fs.mkdirSync(logDir, { recursive: true });
const base = path.join(logDir, `${stamp}-task${args.task}-${mode}`);
const eventsFile = `${base}.events.jsonl`;
const lastFile = `${base}.last.txt`;

// 安全參數固定在這裡，不接受外部傳入其他旗標。
const codexArgs = [
  "exec", "--json",
  "-s", mode === "spec" ? "read-only" : "workspace-write",
  "-c", 'approval_policy="never"',
  "-c", `model_reasoning_effort="${effort}"`,
  "-c", `sandbox_workspace_write.network_access=${network === "on"}`,
  "-C", dir,
  "-o", lastFile,
  "-",
];

// 直接用 node 執行 codex 的 JS 入口，避開 Windows 的 .cmd 與 shell 引號問題。
const codexJs = path.join(execSync("npm root -g").toString().trim(), "@openai", "codex", "bin", "codex.js");
const started = Date.now();
const child = spawn(process.execPath, [codexJs, ...codexArgs], { stdio: ["pipe", "pipe", "pipe"] });
child.stdin.end(prompt);

const events = fs.createWriteStream(eventsFile);
const usage = { input: 0, cached: 0, output: 0, reasoning: 0 };
const errors = [];
let stderr = "";
let buffer = "";
child.stdout.on("data", (chunk) => {
  events.write(chunk);
  buffer += chunk.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop();
  for (const line of lines) {
    try {
      const ev = JSON.parse(line);
      if (ev.type === "turn.completed" && ev.usage) {
        usage.input += ev.usage.input_tokens ?? 0;
        usage.cached += ev.usage.cached_input_tokens ?? 0;
        usage.output += ev.usage.output_tokens ?? 0;
        usage.reasoning += ev.usage.reasoning_output_tokens ?? 0;
      }
      // 模型滿載、額度不足等錯誤只出現在事件裡，不在 stderr。
      if (ev.type === "error" && ev.message) errors.push(ev.message);
    } catch { /* 非 JSON 行忽略，原文仍保存在事件檔 */ }
  }
});
child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  if (process.platform === "win32") {
    // 沙盒相關的子程序可能回報「無法終止」但會隨主程序結束；已實測不留殘留程序。
    try { execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" }); } catch { /* 已結束 */ }
  } else {
    child.kill("SIGKILL");
  }
}, timeoutMin * 60 * 1000);

child.on("close", (code) => {
  clearTimeout(timer);
  events.end();
  const summary = {
    task: args.task, mode, effort, network,
    exitCode: code, timedOut,
    minutes: Math.round((Date.now() - started) / 600) / 100,
    tokens: usage,
    errors,
    lastMessageFile: lastFile, eventsFile,
    stderrTail: stderr.trim().split("\n").slice(-5).join("\n"),
  };
  fs.appendFileSync(path.join(logDir, "usage.jsonl"), JSON.stringify({ at: stamp, ...summary }) + "\n");
  console.log(JSON.stringify(summary));
});
