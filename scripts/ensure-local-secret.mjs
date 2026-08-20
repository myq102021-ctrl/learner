import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";

const envPath=new URL("../.env.local",import.meta.url);
const current=existsSync(envPath)?readFileSync(envPath,"utf8"):"";
if(!/^MODEL_KEYS_MASTER_KEY=/m.test(current)){
  const separator=current&&!current.endsWith("\n")?"\n":"";
  writeFileSync(envPath,`${current}${separator}MODEL_KEYS_MASTER_KEY=${randomBytes(32).toString("hex")}\n`,{mode:0o600});
  process.stdout.write("已创建本地模型密钥加密主密钥。\n");
}
chmodSync(envPath,0o600);
