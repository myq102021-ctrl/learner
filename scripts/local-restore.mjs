import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const input=process.argv[2];if(!input)throw new Error("用法：npm run local:restore -- /备份文件/learner-时间.tar.gz");
const root=resolve(fileURLToPath(new URL("..",import.meta.url)));const archive=resolve(input);const data=resolve(root,"data");const runtime=resolve(data,"runtime");const backups=resolve(data,"backups");
if(!existsSync(archive))throw new Error("找不到指定的备份文件");
const entries=execFileSync("tar",["-tzf",archive],{encoding:"utf8"}).trim().split("\n").filter(Boolean);if(!entries.length||entries.some(entry=>entry!=="runtime"&&!entry.startsWith("runtime/")))throw new Error("备份格式无效");
mkdirSync(backups,{recursive:true});if(existsSync(runtime)){const safety=resolve(backups,`before-restore-${Date.now()}`);renameSync(runtime,safety)}
try{execFileSync("tar",["-xzf",archive,"-C",data],{stdio:"inherit"})}catch(error){rmSync(runtime,{recursive:true,force:true});throw error}
process.stdout.write("恢复完成。请重新运行 npm run local:start。\n");
