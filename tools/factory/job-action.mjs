// Manually triggered factory bridge. No publishing or paid generation.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findBrowser } from "../../gui/e2e/browser.mjs";

const repo = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const delivery = path.join(repo, ".agent-work/factory-delivery");
const cli = path.join(repo, "dist/cli/main.js");
const mode = process.env.SMM_FACTORY_MODE || "generate";
const source = process.env.SMM_FACTORY_SOURCE || "factory-requests/sample.json";
const target = process.env.SMM_FACTORY_TARGET || "preview";
const receipt = {
  schema: "video-factory.handoff/1", provider: "shin-motionmaker",
  repository: process.env.GITHUB_REPOSITORY || "nomuonji/Shin-MotionMaker",
  commit: process.env.GITHUB_SHA || null, mode, source,
  target: mode === "render" ? target : null,
  status: "failed", editorial_review: "unreviewed",
  publishing_authorized: false, published: false, checks: [],
};
function sourcePath(prefix) {
  if (!source.startsWith(prefix + "/") || source.includes("\\") || source.includes("\0") ||
      path.posix.normalize(source) !== source || source.split("/").includes(".."))
    throw Error("Source must remain inside " + prefix + "/");
  return path.join(repo, ...source.split("/"));
}
async function noLinks(folder) {
  if (!(await fs.lstat(folder)).isDirectory()) throw Error("Not a directory: " + folder);
  const pending = [folder];
  while (pending.length) {
    const dir = pending.pop();
    for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
      if (ent.isSymbolicLink()) throw Error("Symlinks are not allowed in factory jobs");
      if (ent.isDirectory() && !["node_modules", ".smm", "output"].includes(ent.name))
        pending.push(path.join(dir, ent.name));
    }
  }
}
async function call(args) {
  const child = spawn(process.execPath, [cli, ...args], {cwd: repo, shell: false, windowsHide: true, stdio: ["ignore","pipe","pipe"]});
  let stdout = "", stderr = "";
  child.stdout.on("data", b => stdout += b);
  child.stderr.on("data", b => stderr += b);
  const code = await new Promise((resolve,reject)=>{child.once("error",reject);child.once("close",resolve);});
  let reply;
  try { reply = JSON.parse(stdout); } catch { throw Error("CLI did not return JSON (exit " + code + "): " + stderr.slice(-500)); }
  if (!reply.ok) throw Error((reply.error?.code || "CLI_ERROR") + ": " + (reply.error?.message || stderr.slice(-500)));
  return reply;
}
async function stage(job, command, flags=[]) {
  let result = await call([command,job,...flags,"--wait-ms","50000"]);
  if (!result.run) throw Error(command + " returned no run");
  const runId = result.run.id;
  const limit = Date.now() + 45*60*1000;
  while (result.run.status === "running") {
    if (Date.now() > limit) throw Error(command + " timed out (" + runId + ")");
    result = await call(["runs","get",job,runId,"--wait-ms","50000","--log-tail","20"]);
  }
  const record = {command,run_id:runId,status:result.run.status,exit_code:result.run.exit_code,verdict:result.result?.verdict ?? null};
  receipt.checks.push(record);
  if (record.status !== "completed" || record.exit_code !== 0 || record.verdict === "fail")
    throw Error("Failed stage: " + JSON.stringify(record));
}
async function fileHash(file) {
  const data = await fs.readFile(file);
  return { bytes:data.length, sha256:createHash("sha256").update(data).digest("hex") };
}
async function generate() {
  const request = sourcePath("factory-requests");
  if (!(await fs.lstat(request)).isFile()) throw Error("Request file not found");
  const result = await call(["generate",source,"--out",".agent-work/factory-delivery","--zip"]);
  const zip = path.resolve(repo,result.result?.archive || "");
  if (!zip.startsWith(delivery + path.sep) || !zip.endsWith(".zip")) throw Error("Unexpected job archive path");
  const output = path.join(delivery,"motion-job.zip");
  await fs.rename(zip,output);
  receipt.status = "starter_generated";
  receipt.output = {path:"motion-job.zip",...await fileHash(output)};
  receipt.note = "Editable starter, not a finished video. A production agent must create the scenes.";
}
async function render() {
  if (!["preview","final"].includes(target)) throw Error("Target must be preview or final");
  const folder = sourcePath("factory-jobs");
  await noLinks(folder);
  const tmp = path.join(repo,".agent-work/factory-job");
  await fs.cp(folder,tmp,{recursive:true,filter:p=>!["node_modules",".smm","output"].includes(path.basename(p))});
  const browser = findBrowser();
  await fs.appendFile(path.join(tmp,"runtime/remotion.config.ts"),
    "\nConfig.setBrowserExecutable(" + JSON.stringify(browser) + ");\nConfig.setConcurrency(2);\n");
  const job = ".agent-work/factory-job";
  const project = JSON.parse(await fs.readFile(path.join(tmp,"project.json"),"utf8"));
  await stage(job,"setup");
  if (target === "final" && project.mode === "explanation") await stage(job,"qc",["--stage","pre"]);
  await stage(job,"validate");
  await stage(job,"render",["--target",target]);
  await stage(job,"ghost-check",["--target",target]);
  if (target === "final") {
    await stage(job,"validate",["--final"]);
    if (project.mode === "explanation") await stage(job,"qc",["--stage","post"]);
  }
  const video = path.join(delivery,"video.mp4");
  await fs.copyFile(path.join(tmp,"output",target === "preview" ? "preview.mp4":"final.mp4"), video);
  await fs.cp(path.join(tmp,"reports"),path.join(delivery,"reports"),{recursive:true});
  receipt.status = "rendered";
  receipt.title = project.title;
  receipt.output = {path:"video.mp4",...await fileHash(video)};
  receipt.note = "Technical render only. Content and publishing have not been approved.";
}
await fs.mkdir(delivery,{recursive:true});
try {
  if (mode === "generate") await generate();
  else if (mode === "render") await render();
  else throw Error("Unsupported factory mode");
  console.log("Factory result: " + receipt.status);
} catch(e) {
  receipt.error = e instanceof Error ? e.message : String(e);
  console.error(receipt.error);
  process.exitCode=1;
} finally {
  await fs.writeFile(path.join(delivery,"handoff.json"),JSON.stringify(receipt,null,2)+"\n");
}
