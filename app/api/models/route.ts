import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { modelConfigs } from "../../../db/schema";
import { decryptApiKey, encryptApiKey } from "../../../lib/model-secrets";
import { validateModelConfig } from "../../../lib/model-validation";

function userId(request:Request){return request.headers.get("oai-authenticated-user-id")||"local-user"}
function publicConfig(row:typeof modelConfigs.$inferSelect){const {encryptedApiKey,...safe}=row;return {...safe,apiKey:"",keyLast4:row.keyLast4}}
async function validateStored(row:typeof modelConfigs.$inferSelect){const result=await validateModelConfig({provider:row.provider,model:row.model,baseUrl:row.baseUrl,apiKey:await decryptApiKey(row.encryptedApiKey)});const checkedAt=new Date();await getDb().update(modelConfigs).set({validationStatus:result.valid?"valid":"invalid",validationError:result.error,lastValidatedAt:checkedAt,updatedAt:checkedAt}).where(eq(modelConfigs.id,row.id));return {...row,validationStatus:result.valid?"valid" as const:"invalid" as const,validationError:result.error,lastValidatedAt:checkedAt,updatedAt:checkedAt}}

export async function GET(request:Request){
  try{
    const rows=await getDb().select().from(modelConfigs).where(eq(modelConfigs.userId,userId(request)));const now=Date.now();
    const checked=await Promise.all(rows.map(row=>{const ttl=row.validationStatus==="valid"?24*60*60*1000:10*60*1000;return row.enabled&&(!row.lastValidatedAt||now-row.lastValidatedAt.getTime()>ttl)?validateStored(row):row}));
    return Response.json({configs:checked.map(publicConfig)});
  }catch(e){return Response.json({error:e instanceof Error?e.message:"读取模型失败"},{status:500})}
}
export async function POST(request:Request){
  try{
    const body=await request.json();const apiKey=String(body.apiKey||"").trim();const model=String(body.model||"").trim();if(!apiKey||!model)return Response.json({error:"模型和 API Key 为必填项"},{status:400});
    const validation=await validateModelConfig({provider:String(body.provider),model,baseUrl:String(body.baseUrl||""),apiKey});if(!validation.valid)return Response.json({error:`模型校验未通过：${validation.error}`},{status:400});
    const db=getDb();const uid=userId(request);const existing=await db.select({id:modelConfigs.id}).from(modelConfigs).where(eq(modelConfigs.userId,uid));const now=new Date();const row={id:crypto.randomUUID(),userId:uid,provider:String(body.provider),providerLabel:String(body.providerLabel),model,baseUrl:String(body.baseUrl||""),encryptedApiKey:await encryptApiKey(apiKey),keyLast4:apiKey.slice(-4),enabled:true,isDefault:existing.length===0,validationStatus:"valid" as const,validationError:null,lastValidatedAt:now,createdAt:now,updatedAt:now};await db.insert(modelConfigs).values(row);return Response.json({config:publicConfig(row)},{status:201});
  }catch(e){return Response.json({error:e instanceof Error?e.message:"保存模型失败"},{status:500})}
}
export async function PATCH(request:Request){
  try{
    const body=await request.json();const uid=userId(request);const db=getDb();const [stored]=await db.select().from(modelConfigs).where(and(eq(modelConfigs.id,String(body.id)),eq(modelConfigs.userId,uid))).limit(1);if(!stored)return Response.json({error:"模型配置不存在"},{status:404});
    const nextModel=typeof body.model==="string"&&body.model.trim()?body.model.trim():stored.model;let validated=stored;
    if(nextModel!==stored.model||body.enabled===true||stored.validationStatus!=="valid")validated=await validateStored({...stored,model:nextModel});
    if(validated.validationStatus!=="valid")return Response.json({error:`模型校验未通过：${validated.validationError||"无法连接"}`},{status:400});
    if(body.isDefault)await db.update(modelConfigs).set({isDefault:false,updatedAt:new Date()}).where(eq(modelConfigs.userId,uid));const changes:Partial<typeof modelConfigs.$inferInsert>={updatedAt:new Date(),validationStatus:"valid",validationError:null,lastValidatedAt:validated.lastValidatedAt};if(typeof body.enabled==="boolean")changes.enabled=body.enabled;if(typeof body.isDefault==="boolean")changes.isDefault=body.isDefault;if(nextModel!==stored.model)changes.model=nextModel;await db.update(modelConfigs).set(changes).where(and(eq(modelConfigs.id,stored.id),eq(modelConfigs.userId,uid)));return Response.json({ok:true,validationStatus:"valid",lastValidatedAt:validated.lastValidatedAt});
  }catch(e){return Response.json({error:e instanceof Error?e.message:"更新失败"},{status:500})}
}
export async function DELETE(request:Request){try{const id=new URL(request.url).searchParams.get("id");if(!id)return Response.json({error:"缺少 id"},{status:400});await getDb().delete(modelConfigs).where(and(eq(modelConfigs.id,id),eq(modelConfigs.userId,userId(request))));return Response.json({ok:true})}catch(e){return Response.json({error:e instanceof Error?e.message:"删除失败"},{status:500})}}
