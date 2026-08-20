import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(fileURLToPath(new URL("..",import.meta.url)));const runtime=resolve(root,"data/runtime");const backups=resolve(root,"data/backups");
if(!existsSync(runtime))throw new Error("尚无本地数据。请先运行 npm run local:start 并至少打开一次页面。");
mkdirSync(backups,{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,"-");const target=resolve(backups,`learner-${stamp}.tar.gz`);
execFileSync("tar",["-czf",target,"-C",resolve(root,"data"),"runtime"],{stdio:"inherit"});
process.stdout.write(`备份完成：${target}\n`);
